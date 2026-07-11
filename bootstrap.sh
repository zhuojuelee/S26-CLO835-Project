#!/usr/bin/env bash
set -euxo pipefail

USER_NAME="ubuntu"
STUDENT_ID="109920256"
KIND_VERSION="v0.32.0"
KIND_NODE_IMAGE="kindest/node:v1.36.1@sha256:3489c7674813ba5d8b1a9977baea8a6e553784dab7b84759d1014dbd78f7ebd5"
KUBECTL_VERSION="v1.36.1"
CLUSTER_NAME="clo835-${STUDENT_ID}"
NODE_PORT="30080"

DEPLOY_DASHBOARD=($1) || DEPLOY_DASHBOARD="false"

export DEBIAN_FRONTEND=noninteractive

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root, for example with sudo." >&2
  exit 1
fi

# Install Docker Engine from Ubuntu packages.
apt-get update
apt-get install -y ca-certificates curl docker.io

systemctl enable --now docker
usermod -aG docker "${USER_NAME}"

# Install kind.
curl -fsSLo /tmp/kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64"
install -o root -g root -m 0755 /tmp/kind /usr/local/bin/kind

# Install kubectl.
curl -fsSLo /tmp/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl

# Create kind cluster with NodePort exposed on the EC2 host.
cat > /tmp/kind-config.yaml <<KIND_CONFIG
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: ${NODE_PORT}
        hostPort: ${NODE_PORT}
        listenAddress: "0.0.0.0"
        protocol: TCP
KIND_CONFIG

mkdir -p "/home/${USER_NAME}/.kube"

kind create cluster --name "${CLUSTER_NAME}" --image "${KIND_NODE_IMAGE}" --config /tmp/kind-config.yaml --wait 5m
kind export kubeconfig --name "${CLUSTER_NAME}" --kubeconfig "/home/${USER_NAME}/.kube/config"

chown -R "${USER_NAME}:${USER_NAME}" "/home/${USER_NAME}/.kube"
export KUBECONFIG="/home/${USER_NAME}/.kube/config"

# Verify setup.
docker version
kind version
kubectl version --client
kubectl get nodes

newgrp docker
export KUBECONFIG="$HOME/.kube/config"

NAMESPACE="orch-109920256"
KEDA_TIMEOUT="90s"
ROLLOUT_TIMEOUT="90s"

kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/cluster/config.yaml

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
kubectl wait --for=condition=Available deployment --all -n keda --timeout="${KEDA_TIMEOUT}"

echo "Applying main server deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/service.yaml
kubectl rollout status deployment/main-server-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "Applying task orchestrator deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/service.yaml
kubectl rollout status deployment/task-orchestrator-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "Creating k8 dashboard..."

if [[ DEPLOY_DASHBOARD == "true" ]]; then
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
  kubectl rollout status deployment/kubernetes-dashboard -n kubernetes-dashboard --timeout="${ROLLOUT_TIMEOUT}"
  kubectl -n kubernetes-dashboard create serviceaccount admin-user --dry-run=client -o yaml | kubectl apply -f -
  kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user --dry-run=client -o yaml | kubectl apply -f -
fi

echo "Applying client (nginx) deployment and service..."

if [[ DEPLOY_DASHBOARD == "true" ]] then
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)

  if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "null" ]; then
      echo "Error: Could not retrieve EC2 Public IP address."
      exit 1
  fi

  export EC2_PUBLIC_IP="$PUBLIC_IP"
  echo "Retrieved EC2 Public IP: $EC2_PUBLIC_IP"
  echo "Injecting IP and applying deployment..."
  curl -s https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/deployment.yaml \
    | sed '/- name: nginx-container/a \          env:\n            - name: EC2_PUBLIC_IP\n              value: "'"$EC2_PUBLIC_IP"'"' \
    | kubectl apply -f -
  kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/service.yaml
  kubectl rollout status deployment/nginx-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"
else
  kubectl apply -f  https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/deployment.yaml
  kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/service.yaml
  kubectl rollout status deployment/nginx-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"
fi

echo "Applying bullmq worker deployment and scaledObject..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/scaledObject.yaml
