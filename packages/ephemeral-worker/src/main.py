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

        record = {
            **record,
            "status": "inProgress",
            "results": {
                "output": f"Started by {WORKER_NAME}",
            },
        }
        write_job_record(client, job_id, record)

        for second in range(1, duration_seconds + 1):
            time.sleep(1)
            record = {
                **record,
                "results": {
                    "output": f"Processed {second}/{duration_seconds} seconds by {WORKER_NAME}",
                },
            }
            write_job_record(client, job_id, record)

        record = {
            **record,
            "status": "completed",
            "results": {
                "output": f"{record['data']['message']} completed by {WORKER_NAME}",
            },
        }
        write_job_record(client, job_id, record)
        print(f"{WORKER_NAME} completed job {job_id}")
        return 0
    except Exception as error:
        record = {
            **record,
            "status": "failed",
            "results": {
                "output": str(error),
            },
        }
        write_job_record(client, job_id, record)
        print(f"{WORKER_NAME} failed job {job_id}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
