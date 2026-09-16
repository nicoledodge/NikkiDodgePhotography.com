#!/usr/bin/env bash
set -euo pipefail

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required but not installed" >&2
  exit 1
fi

: "${IMAGE:?IMAGE environment variable is required}"
: "${APP_NAME:?APP_NAME environment variable is required}"
: "${NAMESPACE:?NAMESPACE environment variable is required}"

PORT="${PORT:-5000}"
SERVICE_TYPE="${SERVICE_TYPE:-ClusterIP}"
REPLICAS="${REPLICAS:-1}"
INGRESS_CLASS="${INGRESS_CLASS:-nginx}"
HOSTNAME="${HOSTNAME:-}"
TLS_SECRET="${TLS_SECRET:-}"
SECRET_NAME="${SECRET_NAME:-}"
CONFIGMAP_NAME="${CONFIGMAP_NAME:-}"
IMAGE_PULL_SECRET="${IMAGE_PULL_SECRET:-}"
AUTH_ENABLED="${AUTH_ENABLED:-false}"
BOOKING_ENABLED="${BOOKING_ENABLED:-false}"

if [[ "$AUTH_ENABLED" != "true" && "$AUTH_ENABLED" != "false" ]] || [[ "$BOOKING_ENABLED" != "true" && "$BOOKING_ENABLED" != "false" ]]; then
  echo "AUTH_ENABLED and BOOKING_ENABLED must each be true or false" >&2
  exit 1
fi
if [[ "$AUTH_ENABLED" != "true" ]]; then
  echo "This release replaces admin authentication. AUTH_ENABLED=true and a verified social admin are required before production deployment." >&2
  exit 1
fi
if [[ "$BOOKING_ENABLED" == "true" && "$AUTH_ENABLED" != "true" ]]; then
  echo "Booking activation requires AUTH_ENABLED=true" >&2
  exit 1
fi
if [[ "$AUTH_ENABLED" == "true" && -z "$SECRET_NAME" ]]; then
  echo "Authentication activation requires the existing app SECRET_NAME" >&2
  exit 1
fi

hosts=()
if [[ -n "$HOSTNAME" ]]; then
  IFS=',' read -r -a raw_hosts <<< "$HOSTNAME"
  for host in "${raw_hosts[@]}"; do
    trimmed_host="$(echo "$host" | xargs)"
    if [[ -n "$trimmed_host" ]]; then
      hosts+=("$trimmed_host")
    fi
  done
fi

kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

deployment_file="$tmp_dir/deployment.yaml"
service_file="$tmp_dir/service.yaml"
ingress_file="$tmp_dir/ingress.yaml"

# A failed preflight or migration leaves the currently running application intact.
# Migrations are additive and serialized in the application database module.
if [[ "$AUTH_ENABLED" == "true" ]]; then
  migration_name="${APP_NAME:0:35}-booking-migrate-$(date +%s)"
  migration_file="$tmp_dir/migration.yaml"
  cat <<EOF > "$migration_file"
apiVersion: batch/v1
kind: Job
metadata:
  name: ${migration_name}
  namespace: ${NAMESPACE}
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 300
  ttlSecondsAfterFinished: 86400
  template:
    metadata:
      labels:
        app: ${APP_NAME}
        component: booking-migration
    spec:
      restartPolicy: Never
      automountServiceAccountToken: false
EOF
  if [[ -n "$IMAGE_PULL_SECRET" ]]; then
    cat <<EOF >> "$migration_file"
      imagePullSecrets:
        - name: ${IMAGE_PULL_SECRET}
EOF
  fi
  cat <<EOF >> "$migration_file"
      containers:
        - name: migrate
          image: ${IMAGE}
          imagePullPolicy: Always
          command: ["/bin/sh", "-ec"]
          args:
            - >-
              node scripts/check-booking-env.mjs --mode auth &&
              node scripts/migrate-booking.mjs &&
              node scripts/check-booking-env.mjs --mode auth --database &&
              if [ "\$BOOKING_ENABLED" = "true" ]; then node scripts/check-booking-env.mjs --mode booking --database; fi
          env:
            - name: NODE_ENV
              value: production
            - name: AUTH_ENABLED
              value: "${AUTH_ENABLED}"
            - name: BOOKING_ENABLED
              value: "${BOOKING_ENABLED}"
          envFrom:
            - secretRef:
                name: ${SECRET_NAME}
EOF
  if [[ -n "$CONFIGMAP_NAME" ]]; then
    cat <<EOF >> "$migration_file"
            - configMapRef:
                name: ${CONFIGMAP_NAME}
EOF
  fi
  cat <<EOF >> "$migration_file"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
EOF
  kubectl apply -f "$migration_file"
  if ! kubectl -n "$NAMESPACE" wait --for=condition=complete "job/$migration_name" --timeout=310s; then
    kubectl -n "$NAMESPACE" logs "job/$migration_name" --tail=80 || true
    echo "Booking preflight/migration failed. The app deployment was not changed." >&2
    exit 1
  fi
fi

cat <<EOF > "$deployment_file"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
spec:
  replicas: ${REPLICAS}
  revisionHistoryLimit: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ${APP_NAME}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
    spec:
      automountServiceAccountToken: false
EOF

if [[ -n "$IMAGE_PULL_SECRET" ]]; then
  cat <<EOF >> "$deployment_file"
      imagePullSecrets:
        - name: ${IMAGE_PULL_SECRET}
EOF
fi

cat <<EOF >> "$deployment_file"
      containers:
        - name: ${APP_NAME}
          image: ${IMAGE}
          imagePullPolicy: Always
          ports:
            - containerPort: ${PORT}
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "${PORT}"
            - name: AUTH_ENABLED
              value: "${AUTH_ENABLED}"
            - name: BOOKING_ENABLED
              value: "${BOOKING_ENABLED}"
          readinessProbe:
            httpGet:
              path: /api/health
              port: ${PORT}
            initialDelaySeconds: 3
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health
              port: ${PORT}
            initialDelaySeconds: 10
            periodSeconds: 20
EOF

if [[ -n "$SECRET_NAME" || -n "$CONFIGMAP_NAME" ]]; then
  cat <<EOF >> "$deployment_file"
          envFrom:
EOF

  if [[ -n "$SECRET_NAME" ]]; then
    cat <<EOF >> "$deployment_file"
            - secretRef:
                name: ${SECRET_NAME}
EOF
  fi

  if [[ -n "$CONFIGMAP_NAME" ]]; then
    cat <<EOF >> "$deployment_file"
            - configMapRef:
                name: ${CONFIGMAP_NAME}
EOF
  fi
fi

cat <<EOF >> "$deployment_file"
          resources:
            requests:
              cpu: ${CPU_REQUEST:-100m}
              memory: ${MEMORY_REQUEST:-256Mi}
            limits:
              cpu: ${CPU_LIMIT:-500m}
              memory: ${MEMORY_LIMIT:-512Mi}
EOF

kubectl apply -f "$deployment_file"

cat <<EOF > "$service_file"
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
spec:
  type: ${SERVICE_TYPE}
  selector:
    app: ${APP_NAME}
  ports:
    - name: http
      port: 80
      targetPort: ${PORT}
      protocol: TCP
EOF

kubectl apply -f "$service_file"

if [[ ${#hosts[@]} -gt 0 ]]; then
  cat <<EOF > "$ingress_file"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: ${INGRESS_CLASS}
  rules:
EOF

  for host in "${hosts[@]}"; do
    cat <<EOF >> "$ingress_file"
    - host: ${host}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${APP_NAME}
                port:
                  number: 80
EOF
  done

  if [[ -n "$TLS_SECRET" ]]; then
    cat <<EOF >> "$ingress_file"
  tls:
    - hosts:
EOF

    for host in "${hosts[@]}"; do
      cat <<EOF >> "$ingress_file"
        - ${host}
EOF
    done

    cat <<EOF >> "$ingress_file"
      secretName: ${TLS_SECRET}
EOF
  fi

  kubectl apply -f "$ingress_file"
fi

kubectl -n "$NAMESPACE" rollout status deployment/"$APP_NAME" --timeout=180s
kubectl -n "$NAMESPACE" get deploy,svc,ingress -o wide | grep "$APP_NAME" || true
