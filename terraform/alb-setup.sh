#!/bin/bash
set -e

echo "Checking AWS credentials..."

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

# if the entry point is from bootstrap.sh, they most likely will have aws creds configured
if aws sts get-caller-identity >/dev/null 2>&1; then
  echo "✅ Existing AWS credentials detected"
else
  echo "⚠️ No valid AWS credentials found"
  if [[ -z "${AWS_ACCESS_KEY:-}" ]] || [[ -z "${AWS_SECRET_KEY:-}" ]] || [[ -z "${AWS_SESSION_TOKEN:-}" ]]; then
    echo "❌ AWS credentials missing."
    echo ""
    echo "Either:"
    echo "1. Configure AWS CLI:"
    echo "   aws configure"
    echo ""
    echo "or"
    echo "2. Export:"
    echo "   AWS_ACCESS_KEY"
    echo "   AWS_SECRET_KEY"
    echo "   AWS_SESSION_TOKEN"
    exit 1
  fi

  echo "Saving AWS credentials..."

  aws configure set aws_access_key_id "$AWS_ACCESS_KEY"
  aws configure set aws_secret_access_key "$AWS_SECRET_KEY"
  aws configure set aws_session_token "$AWS_SESSION_TOKEN"

  echo "✅ AWS credentials configured"
fi

echo ""

export DEBIAN_FRONTEND=noninteractive

if ! command -v terraform &> /dev/null; then
  echo "Terraform not found. Installing..."

  {
    sudo apt-get update -y && sudo apt-get install -y unzip curl
    TMP_DIR=$(mktemp -d)
    LATEST_VERSION=$(curl -sL https://releases.hashicorp.com/terraform/ \
        | grep -oE '/terraform/[0-9]+\.[0-9]+\.[0-9]+/' \
        | head -n 1 \
        | cut -d'/' -f3)
    curl -sSL "https://releases.hashicorp.com/terraform/${LATEST_VERSION}/terraform_${LATEST_VERSION}_linux_amd64.zip" -o "$TMP_DIR/terraform.zip"
    unzip -q "$TMP_DIR/terraform.zip" -d "$TMP_DIR"
    sudo mv "$TMP_DIR/terraform" /usr/local/bin/
    rm -rf "$TMP_DIR"
  } > /dev/null 2>&1

  echo "✅ Terraform installed successfully"
fi

terraform -v

TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 360")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
MAC=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/network/interfaces/macs/ | head -n 1)
VPC_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${MAC}/vpc-id")

echo "Detected Instance: $INSTANCE_ID"
echo "Detected Region:   $REGION"
echo "Detected VPC:      $VPC_ID"
echo "------------------------------------------------"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

cat > terraform.tfvars <<EOF
aws_region         = "$REGION"
vpc_id             = "$VPC_ID"
instance_id        = "$INSTANCE_ID"
EOF

terraform init
terraform apply -auto-approve -var-file="terraform.tfvars"

{ set +x; } 2>/dev/null
ALB_DNS=$(terraform output -raw alb_url)
echo ""
echo "========================================="
echo "                ALB URL                  "
echo "========================================="
echo ""
echo "$ALB_DNS"
echo ""
