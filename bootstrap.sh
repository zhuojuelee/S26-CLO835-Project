#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "       INTERACTIVE CONFIGURATION         "
echo "========================================="
echo ""

read -p "Do you want to deploy the Kubernetes Dashboard? (y/n): " DEPLOY_CHOICE

read -s -p "What do you want the admin secret to be? This will be the password to clear the Redis cache: " ADMIN_SECRET_INPUT
echo ""

ADMIN_SECRET="${ADMIN_SECRET_INPUT:-}"

if [[ "$DEPLOY_CHOICE" =~ ^[Yy](es)?$ ]]; then
  DEPLOY_DASHBOARD="true"
else
  DEPLOY_DASHBOARD="false"
fi

if [ -z "${ADMIN_SECRET_INPUT// }" ]; then
  echo "Admin secret not provided - Redis cache clear feature is disabled"
fi


echo ""
echo "========================================="
echo "           SUMMARY OF INPUTS             "
echo "========================================="
echo "🚀 Deploy Dashboard:  $DEPLOY_CHOICE"
echo "🔑 Admin Secret:     ******** (Hidden for security)"
echo "========================================="

USER_NAME="ubuntu"
STUDENT_ID="109920256"
KIND_NODE_IMAGE="kindest/node:v1.36.1@sha256:3489c7674813ba5d8b1a9977baea8a6e553784dab7b84759d1014dbd78f7ebd5"
CLUSTER_NAME="clo835-${STUDENT_ID}"
NODE_PORT="30080"
KUBERNETES_DASHBAORD_PORT="30081"

set -x

# create kind cluster with NodePort exposed on the EC2 host
# 30080 is for nginx and 30081 is for the kubernetes dashboard
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
      - containerPort: ${KUBERNETES_DASHBAORD_PORT}
        hostPort: ${KUBERNETES_DASHBAORD_PORT}
        listenAddress: "0.0.0.0"
        protocol: TCP
KIND_CONFIG

mkdir -p "/home/${USER_NAME}/.kube"

kind create cluster --name "${CLUSTER_NAME}" --image "${KIND_NODE_IMAGE}" --config /tmp/kind-config.yaml --wait 5m
kind export kubeconfig --name "${CLUSTER_NAME}" --kubeconfig "/home/${USER_NAME}/.kube/config"

chown -R "${USER_NAME}:${USER_NAME}" "/home/${USER_NAME}/.kube"
export KUBECONFIG="/home/${USER_NAME}/.kube/config"

docker version
kind version
kubectl version --client
kubectl get nodes

NAMESPACE="orch-109920256"
KEDA_TIMEOUT="90s"
ROLLOUT_TIMEOUT="90s"

kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/cluster/config.yaml

kubectl config set-context --current --namespace="${NAMESPACE}"

echo "✅ Bootstrap foundation complete."

echo "📦 Applying Redis deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/redis/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/redis/service.yaml
kubectl rollout status deployment/redis-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "⚙️  Installing and setting up KEDA..."
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.20.0/keda-2.20.0.yaml
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.20.0/keda-2.20.0-core.yaml
kubectl wait --for=condition=Established crd/scaledobjects.keda.sh --timeout="${KEDA_TIMEOUT}"
kubectl wait --for=condition=Established crd/scaledjobs.keda.sh --timeout="${KEDA_TIMEOUT}"
kubectl wait --for=condition=Available deployment --all -n keda --timeout="${KEDA_TIMEOUT}"

echo "📦 Applying main server deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/service.yaml

set +x
if [[ -n "${ADMIN_SECRET}" ]]; then
  echo "🔐 ADMIN_SECRET provided"
else
  echo "⚠️  ADMIN_SECRET argument not provided; admin cache clearing will be disabled."
fi
set -x

kubectl rollout status deployment/main-server-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "📦 Applying task orchestrator deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/service.yaml
kubectl rollout status deployment/task-orchestrator-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "🧭 Checking Kubernetes Dashboard setup..."

if [[ "${DEPLOY_DASHBOARD}" == "true" ]]; then
  echo "📊 Creating Kubernetes Dashboard..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
  kubectl rollout status deployment/kubernetes-dashboard -n kubernetes-dashboard --timeout="${ROLLOUT_TIMEOUT}"
  kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard --type='json' -p '[{"op":"replace","path":"/spec/type","value":"NodePort"},{"op":"replace","path":"/spec/ports/0/nodePort","value":30081}]'
  kubectl -n kubernetes-dashboard create serviceaccount admin-user --dry-run=client -o yaml | kubectl apply -f -
  kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user --dry-run=client -o yaml | kubectl apply -f -
fi

if [[ "${DEPLOY_DASHBOARD}" == "true" ]]; then
  echo "🌐 Applying dashboard service changes..."
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)

  if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "null" ]; then
      echo "❌ Error: Could not retrieve EC2 Public IP address."
      exit 1
  fi

  export EC2_PUBLIC_IP="$PUBLIC_IP"
  echo "✅ Retrieved EC2 Public IP: $EC2_PUBLIC_IP"
fi

echo "🔧 Rolling out main server..."
kubectl set env deployment/main-server-deployment EC2_PUBLIC_IP="${EC2_PUBLIC_IP}" ADMIN_SECRET="${ADMIN_SECRET}" -n "${NAMESPACE}"
kubectl rollout status deployment/main-server-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "📦 Applying nginx deployment and service..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/service.yaml
kubectl rollout status deployment/nginx-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

echo "📦 Applying BullMQ worker deployment and ScaledObject..."
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/scaledObject.yaml
