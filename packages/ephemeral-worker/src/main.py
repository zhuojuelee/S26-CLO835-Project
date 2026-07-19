import json
import os
import socket
import sys
import time
from typing import Any

import redis


JOB_KEY_PREFIX = "job:"
WORKER_NAME = f"ephemeral-worker-{socket.gethostname()}"


def get_job_key(job_id: str) -> str:
    return f"{JOB_KEY_PREFIX}{job_id}"


def read_job_record(client: redis.Redis, job_id: str) -> dict[str, Any]:
    raw_record = client.get(get_job_key(job_id))

    if raw_record is None:
        raise RuntimeError(f"Missing Redis job record for {job_id}")

    return json.loads(raw_record)


def write_job_record(client: redis.Redis, job_id: str, record: dict[str, Any]) -> None:
    client.set(get_job_key(job_id), json.dumps(record))


def now_ms() -> int:
    return int(time.time() * 1000)


def get_start_output(record: dict[str, Any]) -> str:
    retries = int(record.get("retries", 0))

    if retries == 0:
        return f"Started by {WORKER_NAME}"

    return f"Started retry {retries}/{record.get('maxRetries', retries)} by {WORKER_NAME}"


def append_output(record: dict[str, Any], message: str) -> list[str]:
    current_output = record.get("results", {}).get("output", [])

    if isinstance(current_output, str):
        current_output = [current_output] if current_output else []
    elif not isinstance(current_output, list):
        current_output = []

    return [*current_output, message]


def start_job_record(record: dict[str, Any]) -> dict[str, Any]:
    now = now_ms()
    started_record = {
        **record,
        "status": "inProgress",
        "results": {
            "output": append_output(record, get_start_output(record)),
        },
        "updatedAt": now,
        "startedAt": now,
    }
    started_record.pop("endedAt", None)
    return started_record


def update_job_progress(record: dict[str, Any], output: str) -> dict[str, Any]:
    return {
        **record,
        "results": {
            "output": append_output(record, output),
        },
        "updatedAt": now_ms(),
    }


def complete_job_record(record: dict[str, Any]) -> dict[str, Any]:
    now = now_ms()
    return {
        **record,
        "status": "completed",
        "results": {
            "output": append_output(
                record,
                f"{record['data']['message']} completed by {WORKER_NAME}",
            ),
        },
        "updatedAt": now,
        "endedAt": now,
    }


def fail_job_record(record: dict[str, Any], error: Exception) -> dict[str, Any]:
    now = now_ms()
    failed_record = {
        **record,
        "status": "failed",
        "results": {
            "output": append_output(record, str(error)),
        },
        "updatedAt": now,
        "endedAt": now,
    }

    return failed_record


def main() -> int:
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    job_id = os.getenv("JOB_ID")

    if not job_id:
        print("JOB_ID is required", file=sys.stderr)
        return 1

    client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
    client.ping()

    record = read_job_record(client, job_id)

    try:
        duration_seconds = max(1, int(record["data"]["durationSeconds"]))

        record = start_job_record(record)
        write_job_record(client, job_id, record)

        for second in range(1, duration_seconds + 1):
            time.sleep(1)
            record = update_job_progress(
                record,
                f"Processed {second}/{duration_seconds} seconds by {WORKER_NAME}",
            )
            write_job_record(client, job_id, record)

        record = complete_job_record(record)
        write_job_record(client, job_id, record)
        print(f"{WORKER_NAME} completed job {job_id}")
        return 0
    except Exception as error:
        record = fail_job_record(record, error)
        write_job_record(client, job_id, record)
        print(f"{WORKER_NAME} failed job {job_id}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
