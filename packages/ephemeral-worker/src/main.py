import os

import redis


def main() -> None:
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    student_id = os.getenv("STUDENT_ID", "local-student")
    duration_seconds = os.getenv("DURATION_SECONDS", "5")

    client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
    client.ping()

    key = f"ephemeral-worker:{student_id}:last-run"
    client.hset(
        key,
        mapping={
            "status": "connected",
            "durationSeconds": duration_seconds,
            "runtime": "python",
        },
    )
    client.expire(key, 3600)

    print(f"ephemeral-worker connected to Redis at {redis_host}:{redis_port}")


if __name__ == "__main__":
    main()
