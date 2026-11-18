# Kubernetes Operations Guide

This deployment path uses `k3s` plus the manifests in `k8s/`.

For CA-signed certificate issuance, `hcl-hub-tls` Secret rotation, Traefik Ingress configuration, and the difference between the installer-generated Ingress and `k8s/6-ingress.yaml`, see the repository [TLS Certificate Runbook](../TLS_CERTIFICATE_RUNBOOK.md).

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

## CA-signed TLS certificate on the production VM

The production certificate files are in `~/tls-work`:

- `hcl-hub-cert.crt` is the CA-issued leaf/server certificate.
- `hcl-hub-cert.p7b` is a PKCS#7 certificate bundle. It may contain the intermediate and root certificates; inspect it before assembling the server chain.
- `hub-server.key` is the private key matching the CSR. Keep it on the VM, do not upload it to the CA, and do not commit it.
- `hub-server.csr` was submitted to the CA; it is not installed into Kubernetes.

The certificate's SANs include `hclswl2learninghub.prod.hclpnp.com`, `hclswl2learninghub`, and `10.115.54.50`. The Ingress supports both DNS names. The short landing URL `https://hclswl2learninghub/` works only for clients whose DNS/search domain resolves that short name to this VM. Use the FQDN if it does not resolve.

### Build the full chain

The private key is not a place to import or append certificates. Keep `hub-server.key` unchanged. Kubernetes receives the certificate chain in `tls.crt` and the private key separately in `tls.key`.

Convert the PKCS#7 bundle to PEM. If the first command reports a PEM/ASN.1 format error, retry with `-inform DER`:

```bash
cd ~/tls-work
openssl pkcs7 -print_certs -in hcl-hub-cert.p7b -out p7b-certs.pem
# For a DER-encoded .p7b instead:
# openssl pkcs7 -inform DER -print_certs -in hcl-hub-cert.p7b -out p7b-certs.pem
```

Split the PEM blocks so each certificate can be identified. The printed subjects and issuers show the chain order; the leaf certificate's issuer is `HCLPNP-ICA`. Do not assume the bundle order or include a root certificate in the server chain.

```bash
awk '/-----BEGIN CERTIFICATE-----/ { n++; f=sprintf("p7b-cert-%02d.pem", n) } f { print > f } /-----END CERTIFICATE-----/ { close(f); f="" }' p7b-certs.pem
for cert in p7b-cert-*.pem; do
   echo "=== $cert ==="
   openssl x509 -in "$cert" -noout -subject -issuer -fingerprint -sha256
done
openssl x509 -in hcl-hub-cert.crt -noout -subject -issuer -fingerprint -sha256 -ext subjectAltName
```

Use the CA-issued leaf first, followed by each intermediate in issuer order (the issuer of one certificate must match the subject of the next). Do not duplicate the leaf if it is also present in the PKCS#7 bundle, and normally omit the self-signed root. Replace the example intermediate filename below with the actual intermediate file(s) identified above:

```bash
cat hcl-hub-cert.crt p7b-cert-02.pem > hcl-hub-fullchain.crt
```

Verify the server certificate matches the private key: these two SHA-256 digests must be identical.

```bash
openssl x509 -in hcl-hub-cert.crt -pubkey -noout | openssl pkey -pubin -outform DER | sha256sum
openssl pkey -in hub-server.key -pubout -outform DER | sha256sum
openssl x509 -in hcl-hub-cert.crt -noout -checkhost hclswl2learninghub.prod.hclpnp.com
```

If the CA supplied a separate root certificate, validate the chain before installing it:

```bash
openssl verify -CAfile hcl-root-ca.crt -untrusted hcl-intermediates.crt hcl-hub-cert.crt
```

Here `hcl-intermediates.crt` contains only the intermediate certificate(s), not the leaf or root. A successful result is `hcl-hub-cert.crt: OK`. Clients must trust the organization's root CA; the Ingress should serve the leaf and intermediate(s), not the root.

For example, if `p7b-cert-02.pem` is the intermediate that issued the leaf, create the intermediate-only file and server chain like this (include additional intermediate files in issuer order if present):

```bash
cat p7b-cert-02.pem > hcl-intermediates.crt
cat hcl-hub-cert.crt p7b-cert-02.pem > hcl-hub-fullchain.crt
```

### Update the Kubernetes Secret

The repository Ingress uses Secret **`hcl-hub-tls`** in namespace **`hcl-learning-hub`**. Do not use the Gemini example name `hcl-hub-ca-tls` unless you also change every Ingress `spec.tls[].secretName` to match. Do not delete a currently referenced Secret before replacing it; that can interrupt HTTPS. Apply the new data to the existing Secret instead:

```bash
cd ~/software/hcl-learning-hub
kubectl create secret tls hcl-hub-tls \
   --namespace hcl-learning-hub \
   --cert="$HOME/tls-work/hcl-hub-fullchain.crt" \
   --key="$HOME/tls-work/hub-server.key" \
   --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/6-ingress.yaml
kubectl get secret hcl-hub-tls -n hcl-learning-hub
kubectl describe ingress hcl-learning-hub -n hcl-learning-hub
```

Traefik watches the Secret and normally reloads the certificate without restarting the web or API deployments. Verify both supported names from a client that trusts the HCLPNP root CA:

```bash
openssl s_client -connect hclswl2learninghub.prod.hclpnp.com:443 -servername hclswl2learninghub.prod.hclpnp.com -showcerts </dev/null
curl -Iv https://hclswl2learninghub.prod.hclpnp.com/
curl -Iv https://hclswl2learninghub/
```

### Will an application upgrade replace this certificate?

No, not when you use the normal `bash deploy/upgrade.sh` or `bash deploy/sync.sh` flow. It pulls code, rebuilds/imports images, and restarts the API/web deployments; it does not recreate the TLS Secret. Traefik continues using the certificate in `hcl-hub-tls`.

A full reinstall with `bash deploy/install.sh --mode kubernetes` is different: `deploy/install-kubernetes.sh` currently generates a self-signed certificate and applies it to `hcl-hub-tls`, replacing the CA-signed certificate. After a full reinstall, reapply the CA Secret using the command above. The same applies if you rerun the installer for a host/DNS change. A code sync or image rollout does not require certificate reinstallation.

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
