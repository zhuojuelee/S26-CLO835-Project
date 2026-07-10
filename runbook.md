# Runbook

This runbook contains the tested demo commands for the project.

## EC2 Pre-Bootstrap Host Setup

> [!NOTE]
> The setup code is a slightly modified version of code provided from Lab 3.

Paste this block into EC2 User Data, or SSH into the EC2 host as `ubuntu`, save it as `setup-ec2-kind.sh`, and run it once with `sudo bash setup-ec2-kind.sh` before `./bootstrap.sh`.
It installs Docker Engine, `kubectl`, and `kind`, then creates the project kind cluster and exports kubeconfig for the `ubuntu` user.

```bash
#!/bin/bash
set -euxo pipefail

USER_NAME="ubuntu"
STUDENT_ID="109920256"
KIND_VERSION="v0.32.0"
KIND_NODE_IMAGE="kindest/node:v1.36.1@sha256:3489c7674813ba5d8b1a9977baea8a6e553784dab7b84759d1014dbd78f7ebd5"
KUBECTL_VERSION="v1.36.1"
CLUSTER_NAME="clo835-${STUDENT_ID}"
NODE_PORT="30080"

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
```

After the script finishes, reconnect or refresh the Docker group membership before running commands that use Docker as `ubuntu`, then run `bootstrap.sh`.

```bash
newgrp docker
export KUBECONFIG="$HOME/.kube/config"
```

### Adding secrets

Run the following to add the admin secret

```bash
kubectl create secret generic secrets --from-literal=ADMIN_SECRET="<the-secret>"
```

### Bootstrapping

Create the bootstrap script

```bash
# create script - vi ...
chmod +x bootstrap.sh
./bootstrap.sh
```

### Get K8 Dashboard Working

Get a token first

```
kubectl -n kubernetes-dashboard create token admin-user
```

Run the following in a new terminal, this will forward the port and it will continue to run.

```
kubectl port-forward -n kubernetes-dashboard service/kubernetes-dashboard 8443:443 --address=127.0.0.1
```

In a new terminal, open a tunnel from on our machine

```
ssh -i <your.pem> -N -L 8443:127.0.0.1:8443 ubuntu@<ec2_public_ip>
```

Access the dashboard from `https://localhost:8443/`

## Runbook Required Procedures

The following section contains all the procedures required for the runbook

### Open the Client

The client runs through an ALB so use the public domain to access it.

> [!NOTE]
> The /dashboard path doesn't work even though `nginx` is setup to proxy to it. This is because it needs an `https` protocol. Since Route53 is disabled for the Lab account, we cannot create a domain using ACM as well.

### Post a burst of queue jobs and watch KEDA scale BullMQ workers from zero to the cap and back to zero

Go to ALB domain and spam queue jobs. View pods via:

```bash
kubectl get pods -l app=bullmq-worker -n orch-109920256
```

### Post an ephemeral job and show the orchestrator-created Kubernetes Job and Pod

Go to ALB domain and spam ephemeral jobs. View pods via:

```bash
kubectl get pods -n orch-109920256 | grep "ephemeral-worker-"
```

### Prove the main server stays responsive during queue and ephemeral load

Open network tab and show that API is non-blocking

### Kill a BullMQ worker Pod mid-drain and show the queue job is retried or reclaimed

1. Run a long running BullMQ job
2. Get the BullMQ pods - `kubectl get pods -l app=bullmq-worker -n orch-109920256`
3. Find the pod and delete it - `kubectl pod <insert_pod> -n orch-109920256`

### Inspect and explain the orchestrator RBAC. Prove it can create jobs in `orch-109920256` and prove it cannot act in any other space

Run the following checks

```bash
kubectl auth can-i create jobs.batch --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n orch-109920256
kubectl auth can-i create jobs.batch --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n default
kubectl auth can-i list pods --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n orch-109920256
```

Expected output is `yes`, then `no`, then `no`. The RoleBinding applies only to Pods running as `orchestrator-service-account-109920256`; other services in the namespace do not inherit it unless their Deployment explicitly sets the same `serviceAccountName`.

### Tear down the project and confirm no leftover resources remain

Run `kind delete cluster --name clo835-109920256`
