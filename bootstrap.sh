#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "   BOOTSTRAP INTERACTIVE CONFIGURATION   "
echo "========================================="
echo ""

read -p "💻 Do you want to deploy the Kubernetes Dashboard? (y/n): " KUBERNETES_DEPLOY_CHOICE

read -p "💻 Do you want to an Application Load Balancer (ALB)? (y/n): " ALB_DEPLOY_CHOICE

if [[ "$ALB_DEPLOY_CHOICE" =~ ^[Yy](es)?$ ]]; then
  DEPLOY_ALB="true"
  echo "Please fetch your AWS Credentials from the Lab details page: [AWS Details] --> [AWS CLI] --> [SHOW]"
  echo ""
  read -s -p "💻 Enter your AWS Access Key: " AWS_ACCESS_KEY
  echo ""
  read -s -p "💻 Enter your AWS Secret Key: " AWS_SECRET_KEY
  echo ""
  read -s -p "💻 Enter your AWS Session Token: " AWS_SESSION_TOKEN
  echo ""

  if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Installing..."
    
    {
      sudo apt-get update -y && sudo apt-get install -y unzip curl
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
      unzip -q awscliv2.zip
      sudo ./aws/install
      rm -rf aws awscliv2.zip
    } > /dev/null 2>&1
    
    echo "✅ AWS CLI installed successfully"
  fi

  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)

  {
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY"
    aws configure set aws_secret_access_key "$AWS_SECRET_KEY"
    aws configure set aws_session_token "$AWS_SESSION_TOKEN"
    aws configure set region "$REGION"

    chmod 700 "$HOME/.aws"
    chmod 600 "$HOME/.aws/credentials"
    chmod 600 "$HOME/.aws/config"
  } > /dev/null 2>&1

  echo ""
  echo "Validating AWS credentials..."

  if aws sts get-caller-identity >/dev/null 2>&1; then
      echo "✅ AWS credentials are valid"
  else
      echo "❌ Invalid AWS credentials"
      exit 1
  fi
else
  DEPLOY_ALB="false"
  echo "ALB will not be deployed"
fi

echo ""
read -s -p "💻 Enter the admin secret. This will be the password to clear the Redis cache: " ADMIN_SECRET_INPUT
echo ""

ADMIN_SECRET="${ADMIN_SECRET_INPUT:-}"

if [[ "$KUBERNETES_DEPLOY_CHOICE" =~ ^[Yy](es)?$ ]]; then
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
echo "🚀 Deploy Dashboard:  $DEPLOY_DASHBOARD"
echo "🌐 Deploy ALB: $DEPLOY_ALB"
echo "🔑 Admin Secret: ** (Hidden for security)"
echo "========================================="

USER_NAME="ubuntu"
STUDENT_ID="109920256"
KIND_NODE_IMAGE="kindest/node:v1.36.1@sha256:3489c7674813ba5d8b1a9977baea8a6e553784dab7b84759d1014dbd78f7ebd5"
CLUSTER_NAME="clo835-${STUDENT_ID}"
NODE_PORT="30080"
KUBERNETES_DASHBAORD_PORT="30081"

set -x

# Create kind config file out of tracing visibility
{ set +x; } 2>/dev/null

KIND_CONFIG_FILE="/tmp/kind-config.clo835-project.yaml"
cat > "$KIND_CONFIG_FILE" <<KIND_CONFIG
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
# ensure ubuntu owns kube directory
sudo chown -R "${USER_NAME}:${USER_NAME}" "/home/${USER_NAME}/.kube"

set -x

# Kind Cluster Creation
kind create cluster --name "${CLUSTER_NAME}" --image "${KIND_NODE_IMAGE}" --config "$KIND_CONFIG_FILE" --wait 5m
kind export kubeconfig --name "${CLUSTER_NAME}" --kubeconfig "/home/${USER_NAME}/.kube/config"

{ set +x; } 2>/dev/null
chown -R "${USER_NAME}:${USER_NAME}" "/home/${USER_NAME}/.kube"
export KUBECONFIG="/home/${USER_NAME}/.kube/config"
set -x

# Quick check
{ set +x; } 2>/dev/null
echo "📋 System Environment Verification:"
docker version --format '  🐳 Docker: {{.Client.Version}} (Client) / {{.Server.Version}} (Server)'
echo "  📦 Kind:   $(kind version | awk '{print $2}')"
echo "  ☸️  Kube:   $(kubectl version --client --short 2>/dev/null || kubectl version --client | head -n1)"
echo "-----------------------------------------"
set -x

kubectl get nodes

NAMESPACE="orch-109920256"
KEDA_TIMEOUT="90s"
ROLLOUT_TIMEOUT="90s"

# Apply bootstrap foundation quietly to trace, showing resources clearly
{ set +x; } 2>/dev/null
echo "🏗️  Applying cluster configurations..."
set -x
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/cluster/config.yaml
kubectl config set-context --current --namespace="${NAMESPACE}"

{ set +x; } 2>/dev/null
echo "✅ Bootstrap foundation complete."
echo "📦 Applying Redis deployment and service..."
set -x

kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/redis/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/redis/service.yaml
kubectl rollout status deployment/redis-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

{ set +x; } 2>/dev/null
echo "⚙️  Installing and setting up KEDA..."
set -x

kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.20.0/keda-2.20.0.yaml >/dev/null
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.20.0/keda-2.20.0-core.yaml >/dev/null
kubectl wait --for=condition=Established crd/scaledobjects.keda.sh --timeout="${KEDA_TIMEOUT}"
kubectl wait --for=condition=Established crd/scaledjobs.keda.sh --timeout="${KEDA_TIMEOUT}"
kubectl wait --for=condition=Available deployment --all -n keda --timeout="${KEDA_TIMEOUT}"

{ set +x; } 2>/dev/null
echo "📦 Applying main server deployment and service..."
set -x

kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/main-server/service.yaml

{ set +x; } 2>/dev/null
if [[ -n "${ADMIN_SECRET}" ]]; then
  echo "🔐 ADMIN_SECRET provided"
else
  echo "⚠️ ADMIN_SECRET argument not provided; admin cache clearing will be disabled."
fi
set -x

kubectl rollout status deployment/main-server-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

{ set +x; } 2>/dev/null
echo "📦 Applying task orchestrator deployment and service..."
set -x

kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/task-orchestrator/service.yaml
kubectl rollout status deployment/task-orchestrator-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

{ set +x; } 2>/dev/null
echo "🧭 Checking Kubernetes Dashboard setup..."
set -x

if [[ "${DEPLOY_DASHBOARD}" == "true" ]]; then
  { set +x; } 2>/dev/null
  echo "📊 Creating Kubernetes Dashboard..."
  set -x
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
  kubectl rollout status deployment/kubernetes-dashboard -n kubernetes-dashboard --timeout="${ROLLOUT_TIMEOUT}"
  kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard --type='json' -p '[{"op":"replace","path":"/spec/type","value":"NodePort"},{"op":"replace","path":"/spec/ports/0/nodePort","value":30081}]'
  kubectl -n kubernetes-dashboard create serviceaccount admin-user --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user --dry-run=client -o yaml | kubectl apply -f - >/dev/null
fi

if [[ "${DEPLOY_DASHBOARD}" == "true" ]]; then
  { set +x; } 2>/dev/null
  echo "🌐 Applying dashboard service changes..."
  set -x
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)

  if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "null" ]; then
      { set +x; } 2>/dev/null
      echo "❌ Error: Could not retrieve EC2 Public IP address."
      exit 1
  fi

  export EC2_PUBLIC_IP="$PUBLIC_IP"
  { set +x; } 2>/dev/null
  echo "✅ Retrieved EC2 Public IP: $EC2_PUBLIC_IP"
  set -x
fi

{ set +x; } 2>/dev/null
echo "🔧 Rolling out main server..."
set -x
kubectl set env deployment/main-server-deployment EC2_PUBLIC_IP="${EC2_PUBLIC_IP:-}" ADMIN_SECRET="${ADMIN_SECRET}" -n "${NAMESPACE}"
kubectl rollout status deployment/main-server-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

{ set +x; } 2>/dev/null
echo "📦 Applying nginx deployment and service..."
set -x
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/nginx/service.yaml
kubectl rollout status deployment/nginx-deployment -n "${NAMESPACE}" --timeout="${ROLLOUT_TIMEOUT}"

{ set +x; } 2>/dev/null
echo "📦 Applying BullMQ worker deployment and ScaledObject..."
set -x
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/zhuojuelee/S26-CLO835-Project/refs/heads/main/manifests/bullmq-worker/scaledObject.yaml

echo ""

if [[ "${DEPLOY_ALB}" == "true" ]]; then
  # the DEPLOY_ALB check will have configured the AWS credentials
  echo "Setting up ALB now..."
  bash ./terraform/alb-setup.sh
fi

if [[ "${DEPLOY_DASHBOARD}" == "true" ]]; then
  { set +x; } 2>/dev/null

  echo "🔑 Request for Kubernetes Dashboard admin token..."
  KUBERNETES_DASHBOARD_ADMIN_TOKEN=$(kubectl -n kubernetes-dashboard create token admin-user)

  echo ""
  echo "========================================="
  echo "       Kubernetes Dashboard Token        "
  echo "========================================="
  echo ""
  echo "$KUBERNETES_DASHBOARD_ADMIN_TOKEN"
  echo ""
fi
