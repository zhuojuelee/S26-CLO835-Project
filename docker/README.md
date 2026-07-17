# Docker

Docker support assets live here.

This directory is reserved for support files such as:

- Dockerfiles
- docker-compose files for local development
- nginx reverse proxy config for the EC2-hosted services
- image build scripts

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

The production nginx image builds the Vite static assets and serves them directly from nginx. It also proxies `/api` to the main-server Service.

If the kubernetes dashboard is deployed, it will also proxy to it, but it has some nuances on what the entry point is. There are three conditions under this architecture:

- via ALB (`http`): The dashboard blocks all non `https` access. To access it, navigate to `https://<ec2_public_ip>:30081` or from the client by clicking the dashbaord chip, which navigates the user to the public IP.
- via Public IP: Same URL as ALB (`http`)
- via ALB (`https`): Nginx will proxy the user to the dashboard directly (currently not supported as Route53 and ACM is disabled for the lab)

> [!WARNING]
> Images should be generic and reusable; secrets belong at runtime through Kubernetes Secrets, GitHub Actions secrets for CI credentials, or local uncommitted environment files. The `ADMIN_SECRET` value used for demo-only. By default, the secret is baked into the image via the build process. Alternatively, it can be provided as a Kubernetes Secret in production.
