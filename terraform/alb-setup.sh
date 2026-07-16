#!/bin/bash
set -e

AWS_ACCESS_KEY=$1
AWS_SECRET_KEY=$2
AWS_SESSION_TOKEN=$3

# export here in case script was ran by itself
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_KEY"
export AWS_SESSION_TOKEN="$AWS_SESSION_TOKEN"

if [ -z "$AWS_ACCESS_KEY" ] || [ -z "$AWS_SECRET_KEY" ] || [ -z "$AWS_SESSION_TOKEN" ]; then
    echo "❌ Error: All three AWS Access Key, Secret Key, Access Token are required to proceed."
    exit 1
fi

echo "✅ Credentials captured successfully. Proceeding with deployment..."
echo ""

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -y && sudo apt-get install -y unzip curl
cd /tmp
LATEST_VERSION=$(curl -sL https://releases.hashicorp.com/terraform/ | grep -oE '/terraform/[0-9]+\.[0-9]+\.[0-9]+/' | head -n 1 | cut -d'/' -f3)
curl -sSL "https://releases.hashicorp.com/terraform/${LATEST_VERSION}/terraform_${LATEST_VERSION}_linux_amd64.zip" -o terraform.zip
unzip -o terraform.zip
sudo mv terraform /usr/local/bin/
rm terraform.zip
cd - > /dev/null
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
