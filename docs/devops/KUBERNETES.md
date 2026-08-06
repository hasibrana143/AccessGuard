# Volume 7 — Kubernetes Manifests (design)

> **Status**: Not yet applied. This doc records the intended K8s architecture so the team can implement incrementally.

## 1. Namespace & RBAC
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: accessguard
---
# rbac.yaml (minimal)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: accessguard-app
  namespace: accessguard
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
```

## 2. ConfigMap & Secret
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: accessguard-config
  namespace: accessguard
data:
  NEXTAUTH_URL: "https://app.accessguard.example"
  LOG_LEVEL: "info"
  NODE_ENV: "production"
  REDIS_URL: "redis://redis-master:6379"
---
# secret.yaml (sealed-secrets or external-secrets in prod)
apiVersion: v1
kind: Secret
metadata:
  name: accessguard-secrets
  namespace: accessguard
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/accessguard"
  NEXTAUTH_SECRET: "CHANGE_ME_32_BYTES_BASE64"
  OAUTH_STATE_SECRET: "CHANGE_ME_32_BYTES_BASE64"
  SENTRY_DSN: "https://...@sentry.io/..."
  GITHUB_CLIENT_ID: "..."
  GITHUB_CLIENT_SECRET: "..."
```

## 3. Deployment (rolling, HPA-ready)
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: accessguard
  namespace: accessguard
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: accessguard
  template:
    metadata:
      labels:
        app: accessguard
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
    spec:
      serviceAccountName: accessguard-app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
        readOnlyRootFilesystem: true
      containers:
      - name: app
        image: ghcr.io/hasibrana143/accessguard:v0.1.0
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: accessguard-config
        - secretRef:
            name: accessguard-secrets
        resources:
          requests:
            cpu: "250m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/.next/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

## 4. Service & Ingress
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: accessguard
  namespace: accessguard
spec:
  selector:
    app: accessguard
  ports:
  - port: 80
    targetPort: 3000
    name: http
---
# ingress.yaml (nginx-ingress example)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: accessguard
  namespace: accessguard
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts: [app.accessguard.example]
    secretName: accessguard-tls
  rules:
  - host: app.accessguard.example
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: accessguard
            port:
              number: 80
```

## 5. Horizontal Pod Autoscaler
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: accessguard
  namespace: accessguard
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: accessguard
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## 6. External dependencies (managed services recommended)
| Component | K8s-native option | Managed service (recommended) |
| --- | --- | --- |
| PostgreSQL | CloudNativePG / Zalando operator | **AWS RDS / Cloud SQL / Neon** |
| Redis | Redis Operator / Bitnami chart | **AWS ElastiCache / Azure Cache / Upstash** |
| Object storage (future) | MinIO | **S3 / R2 / GCS** |
| TLS certs | cert-manager + Let's Encrypt | **managed certs** |

## 7. Deployment pipeline integration
- `docker.yml` pushes `ghcr.io/.../accessguard:vX.Y.Z` + `latest`
- ArgoCD / Flux watches GHCR tags → applies manifests
- Or: GitHub Actions `kustomize build | kubectl apply` on tag push (simpler start)

## 8. Immediate next steps (if team adopts K8s)
1. Add `/api/health/live` + `/api/health/ready` endpoints (liveness = process up; readiness = DB+Redis reachable)
2. Create manifests in `k8s/` folder (versioned with app)
3. Add `helm` chart or `kustomize` overlays (dev/staging/prod)
4. Configure `external-secrets` operator for secret sync from Vault/AWS Secrets Manager
5. Enable `Prometheus` scraping + `Grafana` dashboards (see MONITORING.md)