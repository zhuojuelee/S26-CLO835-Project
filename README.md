# CLO835 Async Job Orchestration

This repository is a Yarn workspace monorepo for a CLO835 project that demonstrates asynchronous job handling, queue-backed workers, KEDA scaling, and native Kubernetes API job creation.

## Environment

Local Docker Compose runs use a root `.env` file:

```bash
cp .env.example .env
yarn compose:up
```

## Workspace Layout

```text
packages/
  client/                 Vite + TypeScript + MUI client, built for S3 static hosting
  main-server/            Express service called by the client
  task-orchestrator/      Express service that enqueues BullMQ jobs or creates Kubernetes Jobs
  bullmq-worker/          BullMQ queue worker scaled by KEDA
  ephemeral-worker/       Python one-shot worker image used by orchestrator-created Kubernetes Jobs
  shared/                 Shared TypeScript types and contracts
deployment/               Docker, docker-compose, nginx, and deployment support files
manifests/                Raw Kubernetes YAML required by the assignment
evidence/                 Demo transcripts and latency/scale evidence
```

## Architecture

The system runs on a kind cluster hosted on an EC2 instance. The browser client is built as a static site and served through S3 static hosting. The client calls the main server only; the main server forwards long-running work to the task orchestrator and responds immediately.

The orchestrator supports two asynchronous paths:

- Queue jobs: push a BullMQ job to Redis, where queue workers consume jobs and KEDA scales the worker Deployment on Redis queue depth.
- Ephemeral jobs: create a one-shot Kubernetes Job through the native Kubernetes API using the orchestrator ServiceAccount.
