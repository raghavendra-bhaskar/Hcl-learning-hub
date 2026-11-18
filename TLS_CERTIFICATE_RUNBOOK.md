# TLS Certificate Runbook

This guide covers a CA-signed certificate for the HCL Software Learning Hub on Kubernetes/k3s, the production container installer, Docker Compose local development, on-premises deployments, and localhost development.

## Important: CSR, self-signed certificates, and aliases

A certificate authority signs a **certificate signing request (CSR)**. The CSR contains the public key and requested identity; it does not contain the private key. The certificate returned by the CA must match the private key used to create that CSR.

You do not import a CA-signed certificate "into" a self-signed certificate. If you create a temporary self-signed certificate first, use the same private key to create the CSR, then replace the temporary certificate with the CA-issued server certificate and its chain. Never send the private key to the CA portal.

An **alias** is a name for a private-key entry in a Java KeyStore, not a property required by PEM certificates or Kubernetes TLS Secrets. The Hub's nginx and Kubernetes deployments use PEM certificate/key files and do not use a Java KeyStore alias. If you are handling a Java application separately, retain its private-key alias for the CA reply; import root/intermediate CA certificates under their own trusted aliases before importing the server certificate reply under the original private-key alias.

## 1. Create a private key and CSR

Run this on the VM or another trusted Linux workstation with OpenSSL. For this VM, the supplied hostname output identifies `hclswl2learninghub.prod.hclpnp.com` as the production FQDN and `10.115.54.50` as its private IP. The command below also includes the short hostname as a SAN; remove that SAN if users will not connect using the short name. Include the IP SAN only if clients will connect directly to that IP. Do not include `localhost` or `localhost.localdomain` for this production certificate.

```bash
umask 077
mkdir -p "$HOME/tls-work"
cd "$HOME/tls-work"
DOMAIN="hclswl2learninghub.prod.hclpnp.com"
openssl req -new -newkey rsa:3072 -nodes \
  -keyout hub-server.key \
  -out hub-server.csr \
  -subj "/CN=${DOMAIN}/O=HCL Software Learning Hub" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:hclswl2learninghub,IP:10.115.54.50"
```

This produces `$HOME/tls-work/hub-server.key` and `$HOME/tls-work/hub-server.csr`. Keep the key private and backed up securely. Do not commit it to Git or email/upload it to the CA. The private key stays on this VM; only submit `hub-server.csr` to the CA portal.

If policy requires creating a temporary self-signed certificate first, use the same key for the CSR:

```bash
DOMAIN="hclswl2learninghub.prod.hclpnp.com"
openssl req -x509 -newkey rsa:3072 -nodes -days 7 \
  -keyout hub-server.key \
  -out temporary-self-signed.crt \
  -subj "/CN=${DOMAIN}/O=HCL Software Learning Hub" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:hclswl2learninghub,IP:10.115.54.50"

openssl req -new -key hub-server.key -out hub-server.csr \
  -subj "/CN=${DOMAIN}/O=HCL Software Learning Hub" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:hclswl2learninghub,IP:10.115.54.50"
```

The temporary certificate is only for interim testing. The CA must issue the final certificate from `hub-server.csr`; do not ask it to sign the temporary certificate file.

Before uploading, inspect the CSR and verify the requested SAN:

```bash
openssl req -in hub-server.csr -noout -verify -subject -text
```

## 2. Submit the CSR to the CA

In the organization-approved CA portal:

1. Select the server/TLS certificate profile approved for the Hub.
2. Upload `hub-server.csr` (or paste its PEM text, including the `BEGIN CERTIFICATE REQUEST` lines).
3. Request `hclswl2learninghub.prod.hclpnp.com` in the Subject Alternative Name (SAN). The Common Name alone is not sufficient for modern browsers.
4. Also request `hclswl2learninghub` and `10.115.54.50` only if those names/addresses are approved and clients will use them.
5. Download the issued **server/leaf certificate**, each **intermediate certificate**, and the **root certificate**. Prefer PEM/Base-64 format. If the CA offers DER/`.cer`, convert it to PEM before using the commands below.

The CA portal receives only the CSR. Keep `hub-server.key` on the system where it was generated.

## 3. Prepare and verify the certificate chain

Save the CA files using clear names, for example `server.crt`, `intermediate-1.crt`, and `root-ca.crt`. The server certificate must match the CSR's private key and include the production DNS name in its SAN.

For nginx and Kubernetes, prepare the server certificate followed by intermediate certificate(s), nearest issuer first:

```bash
cat server.crt intermediate-1.crt intermediate-2.crt > fullchain.crt
```

Omit `intermediate-2.crt` if the CA supplied only one intermediate. Do not normally append the root certificate to the server chain; clients should already trust the root CA. Keep `root-ca.crt` separately for validation and for installing trust on clients that do not yet trust the organization's root.

Verify the hostname, validity, chain, and private-key match before deployment:

```bash
openssl x509 -in server.crt -noout -subject -issuer -dates -ext subjectAltName
openssl x509 -in server.crt -noout -checkhost "$DOMAIN"
openssl verify -CAfile root-ca.crt -untrusted intermediate-1.crt server.crt

# These two SHA-256 public-key digests must match.
openssl x509 -in server.crt -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256
openssl pkey -in hub-server.key -pubout -outform DER | openssl dgst -sha256
```

For multiple intermediates, concatenate them into a temporary `intermediates.crt` in issuer order and use that file with `-untrusted`.

#### Existing production VM files (`~/tls-work`)

The VM's CA-issued leaf is `hcl-hub-cert.crt`, its bundle is `hcl-hub-cert.p7b`, and its matching private key is `hub-server.key`. The issued SANs cover `hclswl2learninghub.prod.hclpnp.com`, `hclswl2learninghub`, and `10.115.54.50`. The checked-in Ingress routes both DNS names; the short URL works only when the client's DNS resolves it to the VM.

The `.p7b` is a certificate bundle, not a private key. Convert it to PEM (add `-inform DER` if the bundle is DER-encoded), inspect each certificate's subject/issuer, and assemble `hcl-hub-fullchain.crt` as the leaf followed by intermediate(s) in issuer order. Do not duplicate the leaf if it is present in the bundle and normally omit the root certificate. Keep `hub-server.key` unchanged; no certificates are imported into that key file. The detailed commands for inspecting and assembling this VM's bundle are in [the Kubernetes Operations Guide](k8s/README.md#ca-signed-tls-certificate-on-the-production-vm).

Update the existing Kubernetes Secret `hcl-hub-tls` in namespace `hcl-learning-hub`; this is the Secret referenced by the repository Ingress. The alternate name `hcl-hub-ca-tls` from Gemini's example will not be used unless the Ingress is changed to reference it.

## 4. Install by deployment type

### Kubernetes / k3s using the repository installer

The active Kubernetes installer, `deploy/install-kubernetes.sh`, uses the k3s-bundled **Traefik** ingress controller and creates the TLS Secret `hcl-hub-tls` in namespace `hcl-learning-hub`. It currently generates a new self-signed certificate during every installer run. After deploying or rerunning the installer, replace that Secret with the CA certificate and matching private key:

```bash
kubectl create secret tls hcl-hub-tls \
  --namespace hcl-learning-hub \
  --cert=fullchain.crt \
  --key=hub-server.key \
  --dry-run=client -o yaml | kubectl apply -f -
```

The generated HTTPS Ingress already references `hcl-hub-tls`. Traefik watches the Secret; a web/API pod restart is normally not required for certificate rotation. Verify the Ingress and Secret:

```bash
kubectl get secret hcl-hub-tls -n hcl-learning-hub
kubectl get ingress -n hcl-learning-hub
kubectl describe ingress hcl-learning-hub-https -n hcl-learning-hub
```

**Important persistence note:** a later `bash deploy/install.sh --mode kubernetes` reruns `deploy/install-kubernetes.sh` and replaces `hcl-hub-tls` with a self-signed certificate. Reapply the CA Secret after that run, or update the TLS-generation block in `deploy/install-kubernetes.sh` (the block that runs `openssl req -x509` and applies `hcl-hub-tls`) to create the Secret from protected CA certificate/key files instead. Keep private-key files outside the repository and restrict their permissions.

For host-specific routing, update the installer-generated Ingress heredoc in `deploy/install-kubernetes.sh` as well: set `tls.hosts` to `${SERVER_FQDN}` and set `rules.host` to `${SERVER_FQDN}`. The current generated manifest omits both host fields and therefore behaves as a catch-all Ingress.

#### If applying `k8s/6-ingress.yaml` directly

The checked-in `k8s/6-ingress.yaml` is a separate sample manifest and is now configured for this VM's FQDN, k3s Traefik, and the `hcl-hub-tls` Secret. If adapting it for another environment, change both the TLS host and rule host to that environment's DNS name and use the Ingress controller actually installed in the cluster.

```yaml
ingressClassName: traefik
tls:
  - hosts:
      - hclswl2learninghub.prod.hclpnp.com
    secretName: hcl-hub-tls
rules:
  - host: hclswl2learninghub.prod.hclpnp.com
    http:
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: web
              port:
                number: 80
```

Before applying, confirm `kubectl get ingressclass` lists `traefik`, that the DNS record for `hclswl2learninghub.prod.hclpnp.com` resolves to the VM/Ingress address, and that the cluster can receive TCP 443. Apply the Secret first, then apply the manifest from the repository's `k8s` directory:

```bash
kubectl create secret tls hcl-hub-tls \\
  --namespace hcl-learning-hub \\
  --cert=fullchain.crt \\
  --key="$HOME/tls-work/hub-server.key" \\
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f 6-ingress.yaml
kubectl get ingress hcl-learning-hub -n hcl-learning-hub
```

Use `ingressClassName: nginx` only if an ingress-nginx controller is installed and is the controller intended for this Ingress. Do not select Traefik or nginx by guesswork; check with `kubectl get ingressclass` and the cluster administrator. The production `k8s/6-ingress.yaml` exposes the app through Ingress; it intentionally does not create an HTTP NodePort bypass.

When switching the sample manifest to Traefik, remove its `nginx.ingress.kubernetes.io/*` annotations; they are nginx-specific and are not needed for this basic Traefik route.

Apply the sample manifest only if your deployment process uses it:

```bash
kubectl apply -f k8s/6-ingress.yaml
```

Do not confuse this sample with the ingress generated by `deploy/install-kubernetes.sh`.

### Production container installer (Docker or Podman)

`bash deploy/install.sh --mode containers` terminates HTTPS in nginx. Its runtime certificate paths are:

- `deploy/runtime/certs/tls.crt` — replace with `fullchain.crt`.
- `deploy/runtime/certs/tls.key` — replace with the private key used for the CSR.
- `deploy/runtime/nginx.ssl.conf` — already points nginx at `/etc/nginx/certs/tls.crt` and `/etc/nginx/certs/tls.key`; it normally does not need editing.

After securely copying the two files into those runtime paths, set restrictive permissions on the key and restart the web container so nginx loads the new certificate:

```bash
chmod 644 deploy/runtime/certs/tls.crt
chmod 600 deploy/runtime/certs/tls.key
bash deploy/start.sh
```

The installer currently generates self-signed runtime files when it runs. A later `deploy/install.sh --mode containers` can overwrite the CA files, so restore/reinstall the CA pair after rerunning it or update the TLS-generation block in `deploy/install-containers.sh` to use your protected CA files.

### Docker Compose local-development stack

The root `docker-compose.yml` is documented as a **local development** stack. It publishes the web container over HTTP (`HTTP_PORT`, default `80`) and does not configure a TLS Secret or CA certificate. For an on-premises or production Compose deployment, terminate HTTPS at an approved reverse proxy/load balancer, or explicitly configure the web nginx container with a certificate volume, TLS listener, and HTTP-to-HTTPS redirect. Do not assume the development Compose file is production TLS-ready.

If TLS terminates at a reverse proxy, install the certificate and private key on that proxy. The Hub's container-to-container API traffic can remain on the private Docker network unless your security architecture requires TLS there too.

### On-premises VM or datacenter

"On-premises" describes where the workload runs, not where TLS must terminate. Choose the matching deployment above:

- k3s/Kubernetes: install the certificate in the `hcl-hub-tls` Secret used by the Traefik Ingress.
- Production Docker/Podman installer: install it under `deploy/runtime/certs/` for the nginx web container.
- Corporate load balancer or reverse proxy in front: install the certificate there and route to the Hub's private HTTP service according to your security policy.

Ensure the public/internal DNS record points to the TLS endpoint, TCP 443 is permitted through the firewall, and the CA certificate SAN matches the name users enter. If using a corporate TLS inspection proxy, coordinate trust and termination with the network/security team.

### Localhost / developer machine

`npm run dev` runs `scripts/generate-certs.js`, which creates a self-signed development certificate. The Vite HTTPS server uses these files:

- Windows: `certs/server.pfx` (takes precedence when present) and `certs/passphrase.txt`.
- Linux/macOS: `certs/server.key` and `certs/server.crt`.
- `certs/truststore.crt`: the generated certificate for local trust/import; browsers and client machines must trust the issuing CA themselves.

For a CA-signed local development certificate, ensure its SAN includes `localhost` and any development hostname. On Windows, replace `certs/server.pfx` with a PFX/PKCS#12 containing the matching private key, server certificate, and intermediate chain; update `certs/passphrase.txt` to the PFX password. On Linux/macOS, replace `certs/server.key` and `certs/server.crt` (use the full chain in the certificate file). Restart Vite after replacing files. These development certificates are unrelated to the Kubernetes Secret and the production container runtime files.

A public CA usually will not issue a certificate for `localhost` or a private IP. For local-only development, prefer the existing self-signed certificate or an organization-approved local development CA.

## Renewal and verification

When the CA certificate approaches expiry, generate a new CSR and key according to organizational policy (or reuse the existing key only if policy explicitly permits it), submit it to the CA, validate the returned chain, and update the applicable Secret/files above. Ensure the private key still matches the renewed server certificate.

Test the endpoint using the real DNS name and SNI:

```bash
openssl s_client -connect hub.example.com:443 -servername hub.example.com -showcerts </dev/null
curl -Iv https://hub.example.com/
```

Check the certificate's dates, SAN, and issuer in the output. Test from a client that trusts the organization's root CA. Never work around trust errors by disabling TLS verification in production.

## Which file or resource changes?

| Deployment | Certificate/key destination | Routing/configuration to check |
|---|---|---|
| Installer-managed Kubernetes/k3s | Kubernetes Secret `hcl-hub-tls` in `hcl-learning-hub` namespace | Generated Ingress in `deploy/install-kubernetes.sh`; it uses Traefik and references this Secret |
| Direct Kubernetes manifests | Same Kubernetes TLS Secret | `k8s/6-ingress.yaml`: actual DNS host, correct `ingressClassName`, and `spec.tls` Secret reference |
| Production Docker/Podman installer | `deploy/runtime/certs/tls.crt` and `tls.key` | `deploy/runtime/nginx.ssl.conf` already references the paths; restart the web container |
| Root Docker Compose development stack | No TLS files configured by default | Add/choose an HTTPS reverse proxy or explicitly configure nginx TLS |
| Local Vite development | Windows `certs/server.pfx`; Linux/macOS `certs/server.key` + `certs/server.crt` | Vite reads the certificate on startup from `vite.config.js` |
| External on-premises LB/proxy | Certificate/key on the TLS-terminating device | Update that device's virtual host/listener and backend route |
