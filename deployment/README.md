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

The Compose stack is for local development. It runs nginx as the browser entrypoint, proxies `/` to Vite for hot reload, proxies `/api` to the main server, and runs the Node services through `tsx watch` with source bind mounts.

Services:

- Nginx browser entrypoint: http://localhost
- Direct Vite client: http://localhost:5173
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

The production nginx image builds the Vite static assets and serves them directly from nginx. It also proxies `/api` to the main-server Service, so production does not need a separate client container running next to nginx.

> [!WARNING]
> Do not bake application secrets into Docker images. Images should be generic and reusable; secrets belong at runtime through Kubernetes Secrets, GitHub Actions secrets for CI credentials, or local uncommitted environment files. The `ADMIN_SECRET` value used for demo-only admin actions should be provided as a Kubernetes Secret in production.
