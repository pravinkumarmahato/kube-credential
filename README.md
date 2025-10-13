# Kube Credential — Issuance & Verification

Name: Pravin Kumar Mahato
Email: praveenmahato026@gmail.com
Contact Number: +91 9969636009
Hosted Frontend URL: (http://13.53.97.117:5000/)

## Assignment summary

Kube Credential is a small microservice-based app that demonstrates credential issuance and verification. It contains:

- Issuance service (Node.js + TypeScript, port 3000, NodePort 32000) Exposed-> http://13.53.97.117:32000/api/issue
- Verification service (Node.js + TypeScript, port 3001, NodePort 32001) Exposed -> http://13.53.97.117:32001/api/verify
- Frontend SPA (React + TypeScript, served by nginx on port 80, NodePort 32080) Exposed -> http://13.53.97.117:5000/
- Kubernetes manifests to deploy the services and backing Postgres instances

Each backend exposes JSON APIs. Issuance records credential payloads (canonicalized and hashed) and records which worker (pod hostname) issued them. Verification calls the Issuance service to check whether a credential was issued and records verification attempts locally.

## Repository layout

Top-level folders and their purpose:

- `backend/issuance` — Issuance service source, tests, Dockerfile, build scripts.
- `backend/verification` — Verification service source, tests, Dockerfile, build scripts.
- `frontend` — React SPA (Vite + TypeScript), Dockerfile and nginx entrypoint that exposes runtime env to the SPA.
- `k8s` — Kubernetes manifests: deployments, services, Postgres resources, ingress.

## High-level architecture

- The frontend calls `/api/issue` (issuance) and `/api/verify` (verification). In Kubernetes the `Ingress` routes `/api/issue` to the Issuance service and `/api/verify` to the Verification service.
- Issuance service stores issued credentials in its own Postgres database (or other DB if configured). Each successful issuance returns a message containing the worker id: `credential issued by <worker-id>`.
- Verification service accepts a credential JSON or `{ "credentialId": "..." }`. It calls Issuance's `/api/issue/check` endpoint to determine issuance state, records verification attempts in its own DB, and returns verification result with worker id and timestamp when valid.

## API reference

Issuance service (default port 3000)

- POST /api/issue
	- Request: JSON credential payload (arbitrary JSON). Example: `{ "name": "Alice" }`
	- Response (201 created):
		{
			"message": "credential issued by worker-xyz",
			"credentialId": "<sha256-hash>",
			"issuedBy": "worker-xyz",
			"issuedAt": "<ISO timestamp>"
		}
	- If already issued: 200 with message `credential already issued by <worker-id>`.

- POST /api/issue/check
	- Request: either the same JSON credential payload, or `{ "credentialId": "<id>" }`.
	- Response: `{ "issued": true/false, "worker": "<issuedBy>", "timestamp": "<issuedAt>" }` (when issued)

Verification service (default port 3001)

- POST /api/verify
	- Request: either the original credential JSON or `{ "credentialId": "<id>" }`.
	- Response when valid:
		{
			"valid": true,
			"credentialId": "<id>",
			"issuedBy": "<worker-id>",
			"issuedAt": "<ISO>",
			"verifiedAt": "<ISO>",
			"verifiedBy": "<worker-id>"
		}
	- When not issued: `{ "valid": false }`

Frontend

- The SPA provides two pages:
	- Issue page — sends request to `/api/issue`
	- Verify page — sends request to `/api/verify`

Client configuration uses Vite env vars or a runtime-generated `/env.js` so that the built image can be configured at container start without rebuilding.

## Environment variables (important)

Common:

- `PORT` — service HTTP port (issuance default 3000, verification default 3001)
- `API_KEY` — service-level API key required by the service middleware (if set in production). Clients must send `x-api-key` header.

Database and inter-service:

- `DATABASE_URL` or Postgres split vars: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. If `DATABASE_URL` is not set, the code will attempt to construct it when `POSTGRES_*` vars are provided.
- `ISSUANCE_SERVICE_URL` — used by verification service to call issuance `/api/issue/check` (default: `http://localhost:3000`). In k8s set to `http://issuance:3000`.
- `ISSUANCE_API_KEY` — if Issuance is protected by an API key, set this on Verification so it can forward checks.

Frontend runtime env (Vite / nginx):

- `VITE_ISSUE_API` and `VITE_VERIFY_API` — base URLs for APIs (can be left empty to use relative paths `/api/issue` and `/api/verify`).
- `VITE_ISSUE_API_KEY` and `VITE_VERIFY_API_KEY` — API keys injected into the SPA at runtime.

## How the code ensures 'worker' reporting

- Each service reads the pod name from the `POD_NAME` environment variable (set in the k8s manifests to `metadata.name`) or falls back to the OS hostname. The issuance API returns `issuedBy` with that ID. Verification returns `verifiedBy` similarly.

## Build & run Local Kubernetes Deployment (Minikube)

Prerequisites: Node.js (18+ recommended), npm, and optionally Docker and kubectl/minikube for k8s.

:: 1️⃣ Set project path
set "PROJECT=s:\Assessments\kube-credential"

:: 2️⃣ Start Minikube with Docker driver
echo [INFO] Starting Minikube...
minikube start --driver=docker

:: 3️⃣ Enable ingress (before applying ingress.yaml)
echo [INFO] Enabling Ingress addon...
minikube addons enable ingress

:: 4️⃣ Create namespace
echo [INFO] Creating namespace kube-credential...
kubectl apply -f "%PROJECT%\k8s\namespace.yaml"

:: 5️⃣ Create image pull secret for GHCR
echo [INFO] Creating image pull secret...
kubectl create secret docker-registry regcred ^
  --docker-server=ghcr.io ^
  --docker-username=<github-username> ^
  --docker-password=<github-token> ^
  -n kube-credential

:: 6️⃣ Ensure only one default StorageClass
echo [INFO] Checking and fixing default StorageClasses...
kubectl get storageclass

:: Remove default flag from Minikube's 'standard' (if exists)
kubectl patch storageclass standard -p "{\"metadata\": {\"annotations\":{\"storageclass.kubernetes.io/is-default-class\":\"false\"}}}" 2>nul

:: Apply Rancher local-path-provisioner and make it default
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
kubectl patch storageclass local-path -p "{\"metadata\": {\"annotations\":{\"storageclass.kubernetes.io/is-default-class\":\"true\"}}}"

:: 7️⃣ Apply app secrets (DB credentials, API keys, etc.)
echo [INFO] Applying Kubernetes secrets...
kubectl apply -f "%PROJECT%\k8s-secrets.yaml" -n kube-credential

:: 8️⃣ Deploy Postgres for both microservices
echo [INFO] Deploying Postgres databases...
kubectl apply -f "%PROJECT%\k8s\postgres-issuance.yaml"
kubectl apply -f "%PROJECT%\k8s\postgres-verification.yaml"

:: 9️⃣ Deploy backend services
echo [INFO] Deploying backend services...
kubectl apply -f "%PROJECT%\k8s\issuance-deployment.yaml"
kubectl apply -f "%PROJECT%\k8s\verification-deployment.yaml"

:: 🔟 Deploy frontend
echo [INFO] Deploying frontend...
kubectl apply -f "%PROJECT%\k8s\frontend-deployment.yaml"

:: 1️⃣1️⃣ Apply ingress after deployments are ready
echo [INFO] Applying ingress resource...
kubectl apply -f "%PROJECT%\k8s\ingress.yaml"

:: 1️⃣2️⃣ Check cluster status
echo [INFO] Verifying deployments...
kubectl get pods -n kube-credential
kubectl get pods -n kube-credential --watch
kubectl get svc -n kube-credential
kubectl -n kube-system get pods | findstr ingress

:: 1️⃣3️⃣ Optional: Port-forward for local testing (skip if using ingress)
echo [INFO] Port-forwarding services...
start cmd /k kubectl port-forward svc/issuance 3000:3000 -n kube-credential
start cmd /k kubectl port-forward svc/verification 3001:3001 -n kube-credential
start cmd /k kubectl port-forward svc/frontend 8081:80 -n kube-credential

:: 1️⃣4️⃣ Test APIs 

curl -v http://localhost:3000/api/issue -X POST -H "Content-Type: application/json" -H "x-api-key: <&QsU8dHNLaVpW5*MDArIJ!F%q4+R)jg6BCEunS9ZfbhKYex7z^3wXvyc$t(2@#Pm>" -d "{\"name\":\"Pravin\",\"email\":\"pravin@example.com\",\"role\":\"student\"}"
curl -v http://localhost:3001/api/verify -X POST -H "Content-Type: application/json" -H "x-api-key: nYD8%Z^$WFp(HXre+9xI)cU4CvG&BkQ6#St2J!qTRaP5L3juygMKhE7fszAw@mNb" -d "{\"credentialId\":\"a3060be9ee23a7d1d161d001556f3a244e97f73917390c3d1e46a726b856129b\"}"

:: 1️⃣5️⃣ Open frontend
start http://localhost:8081

:: 1️⃣6️⃣ Debug helpers
kubectl get pods -n kube-credential -o wide
kubectl describe pod <pod-name> -n kube-credential
kubectl logs <pod-name> -n kube-credential

:: 1️⃣7️⃣ Access Postgres directly
kubectl exec -it <pod-name> -n kube-credential -- bash
psql -U issuance -d issuance

kubectl exec -n kube-credential <pod-name> -- env PGPASSWORD="issuance-password" psql -U issuance -d issuance -c "SELECT * FROM credentials ORDER BY issued_at DESC LIMIT 10;"
kubectl exec -n kube-credential <pod-name> -- cmd /c "set PGPASSWORD=issuance-password && psql -U issuance -d issuance -c \"SELECT * FROM credentials LIMIT 10;\""

:: 1️⃣8️⃣ Cleanup
echo [INFO] Cleaning up resources...
kubectl delete namespace kube-credential
minikube stop
minikube delete


## Tests

Each project contains Jest tests. Run them with:

```cmd
cd backend\issuance
npm install
npm test

cd backend\verification
npm install
npm test

cd frontend
npm install
npm test
```

Unit tests mock DB modules where needed; building and running integration tests may require a running Postgres instance (the test suites provided use fixtures and are designed to run fast in CI).

## Design decisions and notes

- Canonicalization & deterministic id: credentials are canonicalized (sorted keys, stable JSON) and hashed with SHA-256 to create a stable `credentialId`. This ensures the same logical payload always maps to the same id regardless of property order.
- Microservice isolation: The Verification service does not read Issuance DB directly. It calls Issuance `/api/issue/check` to preserve service boundaries.
- Persistence: Postgres is used in manifests; the DB layer is abstracted so tests can mock it. The repository code detects `DATABASE_URL` to enable Postgres; if not present the module expects tests to provide a mocked DB.
- Worker identification: `POD_NAME` env var is used and injected by k8s to provide human-friendly worker names.
- Security: Simple API key middleware protects endpoints. In local dev the middleware allows calls when `API_KEY` is not set.

## Assumptions

- The project will be run in environments where Postgres is available for normal operation. Unit tests mock DB so CI runs do not need DB.
- When deploying to Kubernetes in cloud, the user will push container images to a registry and update the k8s manifests `image:` fields or provide an imagePullSecret.
- The frontend is served behind the same ingress host as the backends and uses relative paths by default; environment variables are provided for alternate deployments.

## Quick troubleshooting

- If `initDb()` throws "DATABASE_URL not configured", ensure you provide `DATABASE_URL` or the `POSTGRES_*` env variables before starting the services.
- If verification never reports `wasIssued: true`: ensure Verification can reach Issuance at the configured `ISSUANCE_SERVICE_URL` and that `ISSUANCE_API_KEY` is configured if Issuance is protected by an API key.
