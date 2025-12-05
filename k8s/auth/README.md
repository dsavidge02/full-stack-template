# Auth Service Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the auth service to production.

## Prerequisites

1. Kubernetes cluster with kubectl configured
2. Docker images pushed to ECR (via GitHub Actions)
3. Certificates generated and available locally

## Setup Steps

### 1. Create Certificate Secret

Create the Kubernetes secret containing your JWT certificates:

```bash
kubectl create secret generic auth-certs \
  --from-file=private.pem=./auth/certs/private.pem \
  --from-file=public.pem=./auth/certs/public.pem
```

### 2. Create Application Secrets

Create the Kubernetes secret containing MongoDB URI and refresh token secret:

```bash
kubectl create secret generic auth-secrets \
  --from-literal=MONGO_URI='<your-mongo-uri>' \
  --from-literal=REFRESH_TOKEN_SECRET='<your-refresh-token-secret>'
```

**Note:** These secrets must be created manually before deployment. Keep the values secure and do not commit them to version control.

### 3. Update Deployment Image

Edit `deployment.yaml` and replace `<ECR_BASE>` with your actual ECR base URL:
- Format: `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com`
- Example: `123456789012.dkr.ecr.us-east-1.amazonaws.com`

Or use the full image path from GitHub Actions output.

### 4. Apply Manifests

Apply all manifests in order:

```bash
# Apply ConfigMap
kubectl apply -f configmap.yaml

# Apply Service
kubectl apply -f service.yaml

# Apply Deployment
kubectl apply -f deployment.yaml
```

## Verification

Check that the deployment is running:

```bash
kubectl get pods -l app=auth-service
kubectl get svc auth-service
```

Test the health endpoint:

```bash
kubectl port-forward svc/auth-service 4000:4000
curl http://localhost:4000/health
```

## Configuration

### ConfigMap Values

Edit `configmap.yaml` to adjust:
- `ENVIRONMENT`: Environment name (default: "prod")
- `AUTH_SERVICE_PORT`: Service port (default: "4000")
- `CERT_PATH`: Path where certificates are mounted (default: "/app/certs")

### Resource Limits

Edit `deployment.yaml` to adjust resource requests and limits based on your workload.

## Secrets Management

- **auth-secrets**: Contains `MONGO_URI` and `REFRESH_TOKEN_SECRET`
  - Must be created manually before first deployment
  - To update: `kubectl create secret generic auth-secrets --from-literal=MONGO_URI='<value>' --from-literal=REFRESH_TOKEN_SECRET='<value>' --dry-run=client -o yaml | kubectl apply -f -`
  - Or delete and recreate: `kubectl delete secret auth-secrets` then create again

- **auth-certs**: Contains `private.pem` and `public.pem`
  - Must be created manually before first deployment
  - Update when certificates are rotated

## Troubleshooting

### Pods not starting

1. Check pod logs: `kubectl logs -l app=auth-service`
2. Verify secrets exist: `kubectl get secrets`
3. Verify ConfigMap exists: `kubectl get configmap auth-config`
4. Check certificate mount: `kubectl describe pod -l app=auth-service`

### Health check failures

1. Verify `/health` endpoint is accessible
2. Check liveness/readiness probe configuration
3. Review pod events: `kubectl describe pod <pod-name>`

