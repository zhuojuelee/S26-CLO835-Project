#!/usr/bin/env bash
set -euxo pipefail

STUDENT_ID="109920256"
NAMESPACE="orch-109920256"
SERVICE_ACCOUNT="orchestrator-service-account-109920256"
ROLE_NAME="orchestrator-job-manager-109920256"
ROLE_BINDING_NAME="orchestrator-job-manager-binding-109920256"
KEDA_TIMEOUT="90s"
ROLLOUT_TIMEOUT="90s"

kubectl apply -f - <<K8S_YAML
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
  labels:
    project: clo835-async-orchestration
    student: "${STUDENT_ID}"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${SERVICE_ACCOUNT}
  namespace: ${NAMESPACE}
  labels:
    component: task-orchestrator
    project: clo835-async-orchestration
    student: "${STUDENT_ID}"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ${ROLE_NAME}
  namespace: ${NAMESPACE}
  labels:
    component: task-orchestrator
    project: clo835-async-orchestration
    student: "${STUDENT_ID}"
rules:
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ${ROLE_BINDING_NAME}
  namespace: ${NAMESPACE}
  labels:
    component: task-orchestrator
    project: clo835-async-orchestration
    student: "${STUDENT_ID}"
subjects:
  - kind: ServiceAccount
    name: ${SERVICE_ACCOUNT}
    namespace: ${NAMESPACE}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ${ROLE_NAME}
K8S_YAML

kubectl config set-context --current --namespace="${NAMESPACE}"

echo "Bootstrap foundation complete."

echo "Applying redis deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/redis/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/redis/service.yaml
kubectl rollout status deployment/redis-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "Installing and setting up KEDA..."
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.20.0/keda-2.20.0.yaml
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.20.0/keda-2.20.0-core.yaml
kubectl wait --for=condition=Established crd/scaledobjects.keda.sh --timeout="${KEDA_TIMEOUT}"
kubectl wait --for=condition=Established crd/scaledjobs.keda.sh --timeout="${KEDA_TIMEOUT}"
kubectl rollout status deployment/keda-operator -n keda --timeout="${KEDA_TIMEOUT}"
kubectl rollout status deployment/keda-operator-metrics-apiserver -n keda --timeout="${KEDA_TIMEOUT}"
kubectl rollout status deployment/keda-admission-webhooks -n keda --timeout="${KEDA_TIMEOUT}"

echo "Applying main server deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/service.yaml
kubectl rollout status deployment/main-server-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "Applying task orchestrator deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/service.yaml
kubectl rollout status deployment/task-orchestrator-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "Applying client (nginx) deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/service.yaml
kubectl rollout status deployment/nginx-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "Applying bullmq worker deployment and scaledObject..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/scaledObject.yaml
