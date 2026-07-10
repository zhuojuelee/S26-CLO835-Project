#!/usr/bin/env bash
set -euxo pipefail

STUDENT_ID="109920256"
NAMESPACE="orch-109920256"
SERVICE_ACCOUNT="orchestrator-service-account-109920256"
ROLE_NAME="orchestrator-job-manager-109920256"
ROLE_BINDING_NAME="orchestrator-job-manager-binding-109920256"

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

echo "Bootstrap foundation complete. Continue adding KEDA, Redis, workloads, ScaledObject, and ResourceQuota here."
