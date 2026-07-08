# Deployment

Deployment support assets live here, while root-level `manifests/`, `bootstrap.sh`, `runbook.md`, and `evidence/` remain in place so the final submission matches the project rubric.

This directory is reserved for support files such as:

- Dockerfiles
- docker-compose files for local integration testing
- nginx reverse proxy config for the EC2-hosted services
- image build scripts
- notes that support the root-level Kubernetes `manifests/`

## Local Compose

From the repository root:

```bash
cp .env.example .env
yarn compose:up
```

The Compose stack is for local development. It runs the client through Vite and the Node services through `tsx watch` with source bind mounts.

Services:

- Client: http://localhost:8080
- Main Server: http://localhost:3000/health
- Task Orchestrator: http://localhost:3001/health
- Redis: localhost:6379

Run the one-shot worker image manually:

```bash
yarn compose:run:ephemeral
```

Stop everything:

```bash
yarn compose:down
```

## Production Configuration

The service Dockerfiles still have final runtime stages for production images. When we add the EC2/kind deployment flow, we can build those images directly from the Dockerfiles and tag them for Docker Hub or GHCR.

Do not bake application secrets into Docker images. Images should be generic and reusable; secrets belong at runtime through Kubernetes Secrets, GitHub Actions secrets for CI credentials, or local uncommitted environment files.
