# syntax=docker/dockerfile:1

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/packages/ephemeral-worker

COPY packages/ephemeral-worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ephemeral-worker/src ./src

CMD ["python", "src/main.py"]
