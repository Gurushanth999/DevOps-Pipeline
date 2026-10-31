# MiniShop | Multi-Environment DevOps CI/CD Pipeline

A Software Deployment & Evolution project demonstrating a repeatable, versioned delivery pipeline for a containerised MiniShop web application. A push to `main` triggers automated builds and tests, publishes release images to GitHub Container Registry (GHCR), deploys to staging, verifies the deployment, and then promotes **the same commit-tagged images** to production.

> **Scope:** The primary deliverable is the DevOps pipeline and its operational evidence. MiniShop is a fundamental demonstration storefront, not a production-ready e-commerce application with advanced features.



## Contents

- [Demonstrated results](#demonstrated-results)
- [Technology stack](#technology-stack)
- [Architecture and environments](#architecture-and-environments)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Automated testing](#automated-testing)
- [CI/CD pipeline](#cicd-pipeline)
- [Deployment and rollback](#deployment-and-rollback)
- [Production monitoring](#production-monitoring)
- [Security and configuration](#security-and-configuration)
- [Troubleshooting](#troubleshooting)
- [Limitations and future improvements](#limitations-and-future-improvements)



## Demonstrated Results

- Successful end-to-end GitHub Actions execution: CI, staging deployment and production promotion.
- Visible frontend change, `MiniShop | Automated CI/CD Run Test`, automatically delivered to both public environments without manually updating the EC2 instances.
- Both environments verified as running backend and frontend images tagged with the same commit SHA: `1af6226069de5248e557ff5d125f9a33951b399c`.
- Application and database health checks passed; the catalogue contained eight seeded products.
- Staging rollback test: a deliberately nonexistent GHCR image tag caused deployment failure, triggered automatic recovery, and left the previously working application healthy. This validates recovery from an **image-pull failure**, not every possible post-startup failure.



## Technology Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, Nginx | Web interface and HTTP serving |
| Backend | Node.js, Express, TypeScript | Application API |
| Database | PostgreSQL 17 | Persistent catalogue data |
| Containers | Docker, Docker Compose | Packaging and service orchestration |
| Source control | Git, GitHub | Versioning and collaboration |
| Automation | GitHub Actions | CI/CD execution |
| Registry | GitHub Container Registry (GHCR) | Versioned commit-tagged release references |
| Hosting | AWS EC2, Ubuntu | Separate staging and production hosts |
| Monitoring | Prometheus, Grafana, Node Exporter, Blackbox Exporter | Production host and HTTP observability |



## Architecture & Environments

```text
Developer / local development
            |
            | git push origin main
            v
     GitHub repository
            |
            v
  GitHub Actions CI runner
  - install dependencies
  - build frontend/backend
  - automated tests
  - Docker and Compose checks
  - publish GHCR images tagged with commit SHA
            |
            v
   Staging EC2 (SSH deployment)
   - pull exact release images
   - Docker Compose rollout
   - health, DB, catalogue, image-tag checks
            |
       only on success
            v
  Production EC2 (SSH deployment)
   - pull the same release images
   - Docker Compose rollout
   - health, DB, catalogue, image-tag checks
            |
            v
 Prometheus / Grafana monitoring
```

The project distinguishes four lifecycle environments:

| Environment | Implementation | Purpose |
| --- | --- | --- |
| Development | Developer workstation / local Docker | Edit and validate source code |
| Testing | Isolated GitHub Actions runner and Compose test stacks | Automated API, integration and full-stack checks |
| Staging | Dedicated AWS EC2 host | Verify a release before production |
| Production | Separate AWS EC2 host | Serve the promoted release and run monitoring |

The staging and production servers have independent PostgreSQL storage and configuration. The CI test databases are disposable; **do not apply test cleanup commands to the EC2 deployments**.

As of the present time, these are the public IPv4 addresses for browser access:

- **Staging:** http://3.220.75.185
- **Production:** http://3.227.88.125

These are demonstration endpoints hosted in a university AWS Learner Lab and may not remain available after the course ends, as the AWS Learner lab environment may be deactivated. Note that the sites use `HTTP` rather than `HTTPS`. In addition, Elastic IPs have been allocated and associated with each EC2 instance to provide stability and retainability.



## Repository Layout

```text
.github/workflows/minishop-CI-CD.yml  # GitHub Actions pipeline
backend/                            # Express API and tests
frontend/                           # React/Vite application
                                    # frontend/src/App.tsx contains the demo heading
database/init.sql                   # Initial catalogue/schema seed
                                    # applied to a NEW PostgreSQL data volume
deployment/deploy.sh                # Deployment verification and rollback
monitoring/                         # Prometheus/Grafana configuration
monitoring/compose.monitoring.yaml # Monitoring Compose stack
tests/deployment/fullstack.test.cjs # Full-stack deployment tests
compose.yaml                        # Application services
compose.test.yaml                   # Isolated integration-test database
.gitignore                          # Local/generated/secret file exclusions
README.md                           # This guide
```



## Prerequisites

- Git and a terminal (PowerShell, Bash or equivalent).
- Docker Desktop with Docker Compose, or Docker Engine with the Compose plugin.
- Node.js and npm compatible with the repository's lockfiles and package requirements.
- For AWS deployment administration: SSH access and appropriately configured EC2 instances.



## Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/Gurushanth999/DevOps-Pipeline.git
   cd DevOps-Pipeline
   ```

2. Create a **local, untracked** `.env` in the repository root:

   ```dotenv
   POSTGRES_PASSWORD=replace-with-a-strong-local-password
   FRONTEND_BIND_ADDRESS=127.0.0.1
   FRONTEND_PORT=8080
   BACKEND_IMAGE=minishop-backend:1.0
   FRONTEND_IMAGE=minishop-frontend:1.0
   ```

   Never commit `.env` or real credentials. The two `*_IMAGE` values above refer to locally built images; production uses commit-tagged GHCR references.

3. Build the application images:

   ```bash
   docker build -t minishop-backend:1.0 ./backend
   docker build -t minishop-frontend:1.0 ./frontend
   ```

4. Start the services:

   ```bash
   docker compose up -d --wait
   docker compose ps
   ```

5. Open http://127.0.0.1:8080. Test the endpoints:

   ```bash
   curl http://127.0.0.1:8080/api/health
   curl http://127.0.0.1:8080/api/db-health
   curl http://127.0.0.1:8080/api/products
   ```

   The backend is bound to `127.0.0.1:3000`, PostgreSQL to `127.0.0.1:5432`, and the frontend defaults to `127.0.0.1:8080` locally. The database initialization script runs when PostgreSQL creates a **new** data directory, not on every restart.

6. Stop the stack without deleting its persistent database:

   ```bash
   docker compose down
   ```

   **Warning:** `docker compose down -v` deletes named volumes and therefore can erase local database data. It is used only for disposable CI test stacks.



## Automated Testing

The workflow executes the following checks before any release is published:

1. Backend dependency installation (`npm ci`), TypeScript build and API smoke tests (`npm test`).
2. Frontend dependency installation (`npm ci`), production build and frontend smoke tests (`npm test`).
3. Backend and frontend Docker image builds.
4. Docker Compose configuration validation.
5. PostgreSQL integration tests against an isolated Compose project and temporary test database.
6. Full-stack deployment tests against an isolated Compose project.
7. Cleanup of the **temporary CI test stacks**, including their disposable volumes.

To run the available package tests locally:

```bash
cd backend
npm ci
npm run build
npm test
cd ../frontend
npm ci
npm run build
npm test
```

The integration and full-stack suites additionally require Docker and the relevant test stack. See `.github/workflows/minishop-CI-CD.yml` for the exact reproducible CI commands and environment variables.



## CI/CD Pipeline

**Workflow:** `.github/workflows/minishop-CI-CD.yml`  
**Triggers:** Push to `main`, or manual `workflow_dispatch`.

| Job | Depends on | Outcome |
| --- | --- | --- |
| `infrastructure-check` | Successful workflow start | Builds, tests, validates and publishes backend/frontend images to GHCR |
| `deploy-staging` | `infrastructure-check` | Deploys and verifies the commit-tagged release on staging |
| `deploy-production` | `deploy-staging` | Promotes and verifies the same release on production |

Workflow concurrency is configured to avoid overlapping deployment runs. The job dependency chain prevents production promotion when staging fails.



### Image Versioning

Each successful build publishes:

```text
ghcr.io/gurushanth999/minishop-backend:<FULL_GIT_COMMIT_SHA>
ghcr.io/gurushanth999/minishop-frontend:<FULL_GIT_COMMIT_SHA>
```

The SHA identifies the source revision used for the build. Both EC2 instances pull these explicit image references rather than an ambiguous floating `latest` tag. Image tags are release identifiers; container image digests are the stronger content-addressed identifiers if stricter supply-chain guarantees are required.



### GitHub Environment Configuration

The GitHub repository defines `staging` and `production` environments. Each has separate values for:

| Setting | Type | Purpose |
| --- | --- | --- |
| `DEPLOY_HOST` | Environment secret | EC2 public IP or DNS |
| `DEPLOY_USER` | Environment secret | SSH login user |
| `DEPLOY_SSH_KEY` | Environment secret | Private key used by GitHub Actions |
| `DEPLOY_HOST_KEY` | Environment variable | Pinned `known_hosts` entry for SSH host verification |

GitHub Actions authenticates to GHCR using `GITHUB_TOKEN` with `packages: write` permission. The server must be able to pull the published images. Do not place private SSH keys in repository files, README examples, or screenshots.



## Deployment & Rollback

The pipeline connects to the target EC2 host via SSH, fetches the requested Git commit, and runs:

```bash
bash deployment/deploy.sh <ghcr-owner> <full-commit-sha>
```

`deployment/deploy.sh` performs the following actions:

1. Records the currently running backend and frontend image references.
2. Pulls the requested GHCR release images.
3. Starts/recreates the application services with Docker Compose.
4. Checks the application homepage, API health, database health and product catalogue.
5. Confirms the running container image references match the requested release.
6. Atomically updates the untracked server `.env` image references after successful verification.
7. If deployment fails, attempts to restart the previous image references and repeats verification.

**Demonstrated failure-recovery test:** On staging, an intentionally nonexistent image tag caused `docker compose pull` to fail. The script then verified that the previous images and all three containers remained healthy and printed `ROLLBACK SUCCESS`. The command still returned a failure status, correctly signalling that the attempted release did not succeed.

Rollback depends on the previous images remaining available locally and on database compatibility. It is **not** a database rollback, and it does not replace backup or migration procedures.



### Post-Deployment Checks

From a server shell in the repository directory:

```bash
sudo docker compose ps
sudo docker inspect -f '{{.Config.Image}}' minishop-backend
sudo docker inspect -f '{{.Config.Image}}' minishop-frontend
curl -fsS http://127.0.0.1/api/health
curl -fsS http://127.0.0.1/api/db-health
curl -fsS http://127.0.0.1/api/products
```

The API's observed successful health response contains `"status":"ok"`; the catalogue response includes `"status":"ok"`, `"count":8` and a `products` array. The deployment script validates these responses.



## Production Monitoring

Production hosts a separate monitoring stack defined in `monitoring/compose.monitoring.yaml`, using:

- **Prometheus:** Metrics collection.
- **Node Exporter:** Linux host metrics.
- **Blackbox Exporter:** HTTP endpoint probing and latency.
- **Grafana:** The **MiniShop Production Monitoring** dashboard.

The demonstrated dashboard contains panels for **CPU**, **RAM**, **disk I/O**, **network activity**, and **HTTP latency**. Monitoring is administered through an SSH tunnel rather than publicly exposing Grafana. Consult the monitoring Compose configuration for the actual local port mappings and target addresses before opening a tunnel.



## Security & Configuration

- Keep `.env`, deployment private keys, tokens and credentials **out of Git**.
- Use GitHub environment secrets for SSH credentials and pin each server's SSH host key.
- Use key-based SSH authentication; the demonstrated servers have SSH password authentication disabled.
- Bind PostgreSQL and backend host ports to localhost; expose only the frontend HTTP port for the demonstration.
- Keep monitoring interfaces private and access them via SSH tunnelling.
- Restrict SSH ingress to trusted administrator IPs when feasible. The demonstration temporarily used broad SSH ingress for setup; that is not a production security recommendation.
- The public demonstration uses **HTTP without TLS**. Do not enter sensitive data. A production-grade deployment should use HTTPS, domain names and stricter network controls.
- PostgreSQL data is persisted in a named Docker volume. Preserve it during routine deployments.



## Troubleshooting

| Symptom | First checks |
| --- | --- |
| CI fails before publishing | Inspect failing `infrastructure-check` step and package/Docker build logs |
| Staging deployment fails | Inspect SSH connectivity, pinned host key, GHCR image availability and Compose logs |
| Production job skipped | Check whether CI or staging failed; promotion requires staging success |
| Site not accessible publicly | Confirm EC2 is running, public IP, security group HTTP port 80, and frontend port binding |
| API/database errors | Check `sudo docker compose ps`, `sudo docker compose logs backend database` and `/api/db-health` |
| Catalogue missing after initial start | Check database initialization logs and whether the PostgreSQL volume was previously created |
| Unexpected old frontend | Verify browser cache, latest workflow commit, deployed frontend image tag and container status |
| Monitoring dashboard unavailable | Check monitoring Compose stack and SSH tunnel configuration |
| Rollback fails | Inspect whether the previous images still exist and whether the database remains compatible |



## Limitations & Future Improvements

This implementation is an educational demonstration, not a hardened production commerce platform. Future improvements include HTTPS and domain-based routing, tighter SSH ingress, infrastructure-as-code, protected-branch review policies, automated security scanning, broader test coverage, database backup/migration/rollback strategies, and digest-pinned image promotion. These are **future improvements**, not claims about features already implemented.



## Synopsis

The GitHub Actions run history, deployment environment records, GHCR package versions, and the actual repository contents itself all collectively provide traceable evidence for the demonstrated delivery process.
