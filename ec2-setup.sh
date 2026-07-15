#!/bin/bash
set -euxo pipefail

USER_NAME="ubuntu"
KIND_VERSION="v0.32.0"
KUBECTL_VERSION="v1.36.1"

# suppress any I/O to keep script running
export DEBIAN_FRONTEND=noninteractive

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root, for example with sudo." >&2
  exit 1
fi

# install Docker Engine from Ubuntu packages
apt-get update
apt-get install -y ca-certificates curl docker.io

systemctl enable --now docker
usermod -aG docker "${USER_NAME}"

# install kind
curl -fsSLo /tmp/kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64"
install -o root -g root -m 0755 /tmp/kind /usr/local/bin/kind

# install kubectl
curl -fsSLo /tmp/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl
