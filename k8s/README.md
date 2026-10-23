# Kubernetes Operations Guide

This deployment path uses `k3s` plus the manifests in `k8s/`.

## Current workload model

| Workload | Kubernetes type | Scalable to 3 right now? | Notes |
|---|---|---|---|
| `api` | `Deployment` | Yes | Stateless API pods can scale horizontally |
| `web` | `Deployment` | Yes | Stateless nginx web pods can scale horizontally |
| `postgres` | `StatefulSet` | No | Current manifest is a single-primary PostgreSQL design with one PVC and no replication/failover layer |

`postgres` is not a 3-replica HA database today. Scaling it above `1` in the current manifest would create an invalid topology, not a safe cluster.

If you need 3 database replicas, the deployment must be redesigned around a PostgreSQL HA solution such as Patroni, CloudNativePG, Crunchy Postgres for Kubernetes, or another replication/failover operator.

## Fresh install

Run from the repository root on the VM:

```bash
bash deploy/install.sh --mode kubernetes
```

What the Kubernetes installer now does:

1. builds local `localhost/hcl-hub/...` images for k3s/containerd
2. restores the **freshest available install dump** in this order:
   - explicit `--dump <file>`
   - newest `scripts/hcl-hub-manual-admin-v*.dump`
   - `backups/latest.dump`
   - legacy `scripts/backup.dump`
3. reuses existing Kubernetes DB/admin secrets by default when a previous install already exists
4. writes `deploy/hub.env` with Kubernetes settings including replica counts

## Reinstall behavior

The installer now supports two different reinstall behaviors.

### Reinstall and keep existing data

Use this when you want to keep the current PostgreSQL data volume and existing admin/database credentials:

```bash
bash deploy/install.sh --mode kubernetes
```

What happens in this mode:

1. existing Kubernetes secret values are reused when they already exist
2. the PostgreSQL PVC is kept
3. the installer rebuilds and re-imports the local API/web images
4. the installer restarts the API/web deployments so the imported `localhost/...:latest` images are used

This is the correct mode for normal repair, upgrade, or host/DNS changes.

### Reinstall and wipe existing Kubernetes data

Use this only when you want a **clean reinstall** and you are okay deleting the current PostgreSQL and API PVC-backed data first:

```bash
bash deploy/install.sh --mode kubernetes --reset-data
```

What `--reset-data` does:

1. deletes the current `api` and `web` Deployments
2. deletes the current `postgres` StatefulSet
3. deletes `postgres-pvc` and `api-data-pvc`
4. waits for PVC deletion, then recreates the workloads
5. restores the selected install dump into the new PostgreSQL instance

Use `--reset-data` when you want the reinstall to start from the install dump instead of reusing the existing database volume.

## Why the manual recovery commands were needed before

You previously had to run commands such as:

```bash
kubectl set image deployment/api api=localhost/hcl-hub/api:latest -n hcl-learning-hub
kubectl set image deployment/web web=localhost/hcl-hub/web:latest -n hcl-learning-hub
podman build -t localhost/hcl-hub/api:latest -f server/Dockerfile ./server
podman save localhost/hcl-hub/api:latest | sudo /usr/local/bin/k3s ctr images import -
```

Those were compensating for three separate problems:

1. older manifests still referenced registry images instead of the local `localhost/...` images used by k3s
2. k3s uses containerd, so a locally built Podman image is **not** automatically visible to Kubernetes until it is imported into k3s
3. reinstalling on top of an existing PostgreSQL PVC generated a new DB password, so the API secret no longer matched the existing database volume

The current repo now addresses those points as follows:

1. the Kubernetes installer rewrites the manifests to `localhost/hcl-hub/...:latest`
2. the installer and sync flow import the built images into k3s containerd automatically
3. the Kubernetes installer now reuses existing credentials by default and only wipes PVC-backed data when `--reset-data` is explicitly requested

## OpenSSL / Prisma note

You previously ran:

```bash
sed -i '/FROM node:20-alpine/a RUN apk add --no-cache openssl openssl-dev' server/Dockerfile
```

That should no longer be needed. The repository `server/Dockerfile` already installs the required OpenSSL packages for Prisma.

## Refresh the install baseline from the current development database

Run this on the development machine from the repo root before building a new VM installer or testing a clean VM install:

```bash
npm run dump:refresh-install
```

That command:

1. reads `server/.env`
2. captures a fresh custom PostgreSQL dump from the current development database
3. writes a versioned `scripts/hcl-hub-manual-admin-v*.dump`
4. refreshes `backups/latest.dump`
5. refreshes `scripts/backup.dump` so older workflows still use the latest baseline

## Upgrade / sync on the VM

Normal Kubernetes sync:

```bash
cd ~/software/hcl-learning-hub
bash deploy/sync.sh
```

If you want the sync recorded against a version label:

```bash
cd ~/software/hcl-learning-hub
bash deploy/sync.sh --version 7.1
```

What Kubernetes sync does:

1. creates a safety backup in `backups/`
2. refreshes `backups/latest.dump`
3. pulls the latest Git code
4. rebuilds the API and web images
5. imports them into `k3s` containerd
6. restarts the Kubernetes deployments

If you already have a working Kubernetes install, `bash deploy/sync.sh` is the normal way to apply code changes. You should not need to run the manual `podman build` and `ctr images import` commands yourself unless you are doing emergency recovery.

## Change DNS / hostname and keep existing data

If the DNS name changes and you want the existing deployment/data to keep working, rerun the Kubernetes installer with the new host name:

```bash
cd ~/software/hcl-learning-hub
bash deploy/install.sh --mode kubernetes --host new.example.internal
```

What this updates:

1. regenerates the TLS secret for the new host name
2. rewrites the API `FRONTEND_ORIGIN` value used for CORS
3. rewrites `deploy/hub.env` with the new `SERVER_FQDN`
4. keeps the current PVC-backed database data and existing secrets unless `--reset-data` is also passed

After changing DNS, verify:

```bash
kubectl get ingress -n hcl-learning-hub
kubectl rollout status deployment/api -n hcl-learning-hub
kubectl rollout status deployment/web -n hcl-learning-hub
kubectl get pods -n hcl-learning-hub
```

## Scaling API and web to 3 replicas

### One-time live scale

```bash
kubectl scale deployment/api -n hcl-learning-hub --replicas=3
kubectl scale deployment/web -n hcl-learning-hub --replicas=3
kubectl get pods -n hcl-learning-hub
```

### Make `deploy/start.sh` keep that scale

Edit `deploy/hub.env` on the VM and set:

```bash
API_REPLICAS=3
WEB_REPLICAS=3
```

Then restart via the deployment helper:

```bash
bash deploy/start.sh
```

`deploy/start.sh` now reads those values and scales the stateless workloads back to the configured counts instead of forcing them to `1`.

## PostgreSQL replica note

Do **not** run:

```bash
kubectl scale statefulset/postgres -n hcl-learning-hub --replicas=3
```

with the current manifests.

Reason:

- the manifest uses one standalone PostgreSQL container pattern
- no streaming replication is configured
- no failover manager exists
- no replica bootstrap/init logic exists
- the current design assumes a single writer database

## Useful status commands

```bash
kubectl get pods -n hcl-learning-hub
kubectl get deploy,sts,svc,ingress -n hcl-learning-hub
kubectl logs -n hcl-learning-hub -l app=api --tail=200
kubectl logs -n hcl-learning-hub -l app=web --tail=200
kubectl describe pod -n hcl-learning-hub <pod-name>
```

## Uninstall Kubernetes workloads

### Namespace removal

This removes the whole Kubernetes deployment:

```bash
kubectl delete namespace hcl-learning-hub
```

### Helper script

A helper script is also available:

```bash
bash deploy/uninstall-kubernetes.sh --yes
```

If you want it to attempt PVC cleanup too:

```bash
bash deploy/uninstall-kubernetes.sh --purge-pvc --yes
```

## Reinstall with a specific dump

```bash
bash deploy/install.sh --mode kubernetes --dump /path/to/current.dump
```

## Recommended clean workflow

1. on the development machine, run:
   ```bash
   npm run dump:refresh-install
   ```
2. commit the content/code changes you want to ship
3. on the VM, run:
   ```bash
   bash deploy/sync.sh
   ```
4. for a brand-new VM, run:
   ```bash
   bash deploy/install.sh --mode kubernetes
   ```
