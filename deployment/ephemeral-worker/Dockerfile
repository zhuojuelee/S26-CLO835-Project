FROM python:3.13-alpine AS runtime

WORKDIR /app/packages/ephemeral-worker

COPY packages/ephemeral-worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ephemeral-worker/src ./src

CMD ["python", "src/main.py"]
