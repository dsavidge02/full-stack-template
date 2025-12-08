# Full Stack Template - Kubernetes Deployment Guide

This guide provides step-by-step instructions for deploying both the auth service and frontend service to a Kubernetes cluster.

## Prerequisites

Before deploying, ensure you have:

1. **Kubernetes cluster** with `kubectl` configured and access to the cluster
2. **AWS CLI** configured with appropriate credentials
3. **ECR repositories** created (or they will be created automatically by GitHub Actions)
4. **AWS Load Balancer Controller** installed in your cluster (for ALB Ingress)
5. **Docker images** built and pushed to ECR (via GitHub Actions or manually)

## Directory Structure

```
k8s/
├── auth/
│   ├── deployment.yaml          # Auth service deployment
│   ├── service.yaml              # Auth service ClusterIP
│   ├── configmap.yaml           # Non-sensitive auth configuration
│   ├── secrets.yaml.template     # Template for auth secrets
│   └── cert-secret.yaml.template # Template for certificate secret
└── frontend/
    ├── deployment.yaml           # Frontend deployment
    ├── service.yaml              # Frontend service ClusterIP
    └── ingress.yaml              # ALB Ingress with SSL
```

## Pre-Deployment Setup

### 1. Create ECR Repositories (if not already created)

The GitHub Actions workflow will create these automatically, but you can also create them manually:

```bash
aws ecr create-repository \
  --repository-name full-stack-template/auth-service \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

aws ecr create-repository \
  --repository-name full-stack-template/frontend-service \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

### 2. Build and Push Docker Images

#### Option A: Using GitHub Actions (Recommended)

1. Push your code to the `main` branch, or
2. Manually trigger the workflow from the GitHub Actions tab

The workflow will:
- Build both Docker images
- Push them to ECR with tags: `latest` and `<commit-sha>`

#### Option B: Manual Build and Push

```bash
# Get your AWS account ID and ECR base URL
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE=$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_BASE

# Build and push auth service
docker build -t $ECR_BASE/full-stack-template/auth-service:latest ./auth
docker push $ECR_BASE/full-stack-template/auth-service:latest

# Build and push frontend service
docker build -t $ECR_BASE/full-stack-template/frontend-service:latest ./frontend
docker push $ECR_BASE/full-stack-template/frontend-service:latest
```

### 3. Create Kubernetes Secrets

#### Auth Service Secrets

Create the secret containing MongoDB URI and refresh token secret:

```bash
kubectl create secret generic auth-secrets \
  --from-literal=AUTH_SERVICE_MONGO_URI='<your-mongodb-connection-string>' \
  --from-literal=REFRESH_TOKEN_SECRET='<your-refresh-token-secret>' \
  --namespace=default
```

**Important:** Replace the placeholders with your actual values. Never commit these values to git.

#### Certificate Secret

Create the secret containing your JWT certificates:

```bash
kubectl create secret generic auth-certs \
  --from-file=private.pem=./auth/certs/private.pem \
  --from-file=public.pem=./auth/certs/public.pem \
  --namespace=default
```

**Note:** Ensure your certificate files exist in `./auth/certs/` before running this command.

### 4. Update Deployment Image URLs

Before deploying, you need to replace `<ECR_BASE>` in the deployment files with your actual ECR base URL.

#### Get Your ECR Base URL

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE=$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
echo "ECR_BASE: $ECR_BASE"
```

#### Update Deployment Files

**For auth service:**
- Edit `k8s/auth/deployment.yaml`
- Replace `<ECR_BASE>` on line 22 with your ECR base URL

**For frontend service:**
- Edit `k8s/frontend/deployment.yaml`
- Replace `<ECR_BASE>` on line 22 with your ECR base URL

**Example:**
```yaml
# Before
image: <ECR_BASE>/full-stack-template/auth-service:latest

# After (example)
image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/full-stack-template/auth-service:latest
```

## Deployment Steps

### 1. Deploy Auth Service

```bash
# Apply ConfigMap
kubectl apply -f k8s/auth/configmap.yaml

# Apply Service
kubectl apply -f k8s/auth/service.yaml

# Apply Deployment
kubectl apply -f k8s/auth/deployment.yaml
```

### 2. Deploy Frontend Service

```bash
# Apply Service
kubectl apply -f k8s/frontend/service.yaml

# Apply Deployment
kubectl apply -f k8s/frontend/deployment.yaml

# Apply Ingress (creates ALB)
kubectl apply -f k8s/frontend/ingress.yaml
```

### 3. Deploy Everything at Once

```bash
# Apply all resources in order
kubectl apply -f k8s/auth/configmap.yaml
kubectl apply -f k8s/auth/service.yaml
kubectl apply -f k8s/auth/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/ingress.yaml
```

## Verification

### Check Deployment Status

```bash
# Check deployments
kubectl get deployments

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# Check pods
kubectl get pods -l app=auth-service
kubectl get pods -l app=frontend-service
```

### View Pod Logs

```bash
# Auth service logs
kubectl logs -l app=auth-service --tail=50

# Frontend service logs
kubectl logs -l app=frontend-service --tail=50
```

### Test Health Endpoints

```bash
# Port forward to auth service
kubectl port-forward svc/auth-service 4000:4000

# In another terminal, test health endpoint
curl http://localhost:4000/health

# Port forward to frontend service
kubectl port-forward svc/frontend-service 80:80

# In another terminal, test frontend
curl http://localhost:80/
```

### Check Ingress/ALB Status

```bash
# Get ingress details
kubectl describe ingress frontend-ingress

# Get ALB URL (after ingress is created)
kubectl get ingress frontend-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Configuration

### ConfigMap Values

Edit `k8s/auth/configmap.yaml` to adjust non-sensitive configuration:

- `ENVIRONMENT`: Environment name (default: "prod")
- `AUTH_SERVICE_PORT`: Port the auth service listens on (default: "4000")
- `CERT_PATH`: Path where certificates are mounted (default: "/app/certs")

After updating:
```bash
kubectl apply -f k8s/auth/configmap.yaml
kubectl rollout restart deployment/auth-service
```

### Updating Secrets

#### Update Auth Secrets

```bash
kubectl create secret generic auth-secrets \
  --from-literal=AUTH_SERVICE_MONGO_URI='<new-mongo-uri>' \
  --from-literal=REFRESH_TOKEN_SECRET='<new-refresh-token-secret>' \
  --namespace=default \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up changes
kubectl rollout restart deployment/auth-service
```

#### Update Certificate Secret

```bash
kubectl create secret generic auth-certs \
  --from-file=private.pem=./auth/certs/private.pem \
  --from-file=public.pem=./auth/certs/public.pem \
  --namespace=default \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up changes
kubectl rollout restart deployment/auth-service
```

### Updating Deployments

After updating deployment YAML files:

```bash
# Apply changes
kubectl apply -f k8s/auth/deployment.yaml
kubectl apply -f k8s/frontend/deployment.yaml

# Or force a rolling update
kubectl rollout restart deployment/auth-service
kubectl rollout restart deployment/frontend-service
```

## Ingress Configuration

The frontend ingress is configured with:

- **Ingress Class**: `alb` (AWS Load Balancer Controller)
- **Scheme**: `internet-facing`
- **SSL**: HTTPS on port 443 with automatic redirect from HTTP
- **Certificate**: AWS ACM certificate ARN (configured in `k8s/frontend/ingress.yaml`)
- **Hosts**: `savidgeapps.com` and `www.savidgeapps.com`

**To update the certificate ARN:**
1. Edit `k8s/frontend/ingress.yaml`
2. Update the `alb.ingress.kubernetes.io/certificate-arn` annotation
3. Apply: `kubectl apply -f k8s/frontend/ingress.yaml`

## Troubleshooting

### Pods Not Starting

1. **Check pod status:**
   ```bash
   kubectl get pods
   kubectl describe pod <pod-name>
   ```

2. **Check pod logs:**
   ```bash
   kubectl logs <pod-name>
   kubectl logs <pod-name> --previous  # If pod crashed
   ```

3. **Verify secrets exist:**
   ```bash
   kubectl get secrets
   kubectl get secret auth-secrets -o yaml
   kubectl get secret auth-certs -o yaml
   ```

4. **Verify ConfigMap exists:**
   ```bash
   kubectl get configmaps
   kubectl get configmap auth-config -o yaml
   ```

5. **Check certificate mount:**
   ```bash
   kubectl exec -it <auth-pod-name> -- ls -la /app/certs
   ```

### Image Pull Errors

1. **Verify image exists in ECR:**
   ```bash
   aws ecr describe-images --repository-name full-stack-template/auth-service --region us-east-1
   aws ecr describe-images --repository-name full-stack-template/frontend-service --region us-east-1
   ```

2. **Check image URL in deployment:**
   ```bash
   kubectl get deployment auth-service -o jsonpath='{.spec.template.spec.containers[0].image}'
   kubectl get deployment frontend-service -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```

3. **Verify ECR authentication:**
   - Ensure your cluster nodes have IAM roles with ECR read permissions
   - Or configure image pull secrets if using different credentials

### Health Check Failures

1. **Check health endpoint manually:**
   ```bash
   kubectl port-forward svc/auth-service 4000:4000
   curl http://localhost:4000/health
   ```

2. **Review probe configuration:**
   ```bash
   kubectl get deployment auth-service -o yaml | grep -A 10 livenessProbe
   ```

3. **Check if service is responding:**
   ```bash
   kubectl exec -it <auth-pod-name> -- wget -qO- http://localhost:4000/health
   ```

### Ingress Not Creating ALB

1. **Verify AWS Load Balancer Controller is installed:**
   ```bash
   kubectl get deployment -n kube-system aws-load-balancer-controller
   ```

2. **Check controller logs:**
   ```bash
   kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
   ```

3. **Verify IAM permissions:**
   - The controller needs IAM permissions to create ALBs
   - Check the controller's service account IAM role

4. **Check ingress events:**
   ```bash
   kubectl describe ingress frontend-ingress
   ```

### Cannot Connect to Services

1. **Verify services are running:**
   ```bash
   kubectl get svc
   kubectl get endpoints
   ```

2. **Check service selectors match pod labels:**
   ```bash
   kubectl get pods --show-labels
   kubectl get svc auth-service -o yaml | grep selector
   ```

3. **Test service connectivity:**
   ```bash
   kubectl run test-pod --image=curlimages/curl --rm -it -- curl http://auth-service:4000/health
   ```

### Certificate Issues

1. **Verify certificates are mounted:**
   ```bash
   kubectl exec -it <auth-pod-name> -- ls -la /app/certs
   ```

2. **Check certificate files exist:**
   ```bash
   kubectl exec -it <auth-pod-name> -- cat /app/certs/public.pem
   ```

3. **Verify certificate secret:**
   ```bash
   kubectl get secret auth-certs -o jsonpath='{.data}' | jq 'keys'
   ```

## Rollback

If you need to rollback a deployment:

```bash
# View deployment history
kubectl rollout history deployment/auth-service
kubectl rollout history deployment/frontend-service

# Rollback to previous version
kubectl rollout undo deployment/auth-service
kubectl rollout undo deployment/frontend-service

# Rollback to specific revision
kubectl rollout undo deployment/auth-service --to-revision=2
```

## Cleanup

To remove all deployed resources:

```bash
# Delete deployments and services
kubectl delete -f k8s/frontend/ingress.yaml
kubectl delete -f k8s/frontend/deployment.yaml
kubectl delete -f k8s/frontend/service.yaml
kubectl delete -f k8s/auth/deployment.yaml
kubectl delete -f k8s/auth/service.yaml
kubectl delete -f k8s/auth/configmap.yaml

# Delete secrets (optional - be careful!)
kubectl delete secret auth-secrets
kubectl delete secret auth-certs
```

## Security Notes

- **Never commit secrets to git**: The `.gitignore` file excludes `*-secrets.yaml` files
- **Use Secrets for sensitive data**: MongoDB URIs and other credentials should always be in Secrets
- **Rotate secrets regularly**: Update secrets periodically for security
- **Limit access**: Use RBAC to limit who can view secrets in the cluster
- **Certificate security**: Keep certificate private keys secure and rotate them regularly

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)

