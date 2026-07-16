# Runbook

This runbook contains the tested demo commands for the project.

## Bootstrapping

The bootstrap uses a mix of code from Lab 3 and includes the set up code for applying the deployments for the project.

> [!WARNING]
> The bootstrap script assumes you have `kind`, `docker` and `kubectl` installed on the instance. If you have not done that, please run the setup script using `sudo ./ec2-setup.sh`

The instance set up should be:

- `kind`: `v0.32.0`
- `kubectl`: `v1.36.1`
- `docker`: Any version the installer pulls

Once it is ready continue with the steps below. During the bootstrapping process, you will be prompted with some questions:

1. Do you want to deploy the Kubernetes Dashboard - `y/n`
2. Do you want to deploy an ALB. If `y` (yes) , you will be prompted to enter AWS credentials. - `y/n`

> [!IMPORTANT]
> If you want to deploy the ALB - please ensure you use a bigger instance such as m5.large.

3. Set the admin secret. If provided, that value will be the password to clear the redis cache. If none was provided, that feature will be disabled.

```bash
git clone https://github.com/zhuojuelee/S26-CLO835-Project.git
cd S26-CLO835-Project
sudo -E ./bootstrap.sh
```

### [`Optional`] Getting Kubernetes Token and Accessing it via Port Forwarding

Get a token first by ssh into the EC2 instance and run this command:

```bash
kubectl -n kubernetes-dashboard create token admin-user
```

Ensure that your EC2's security group is setup to accept incoming traffic to port `8443`

Run the following in a new terminal, this will forward the port and it will continue to run.

```bash
kubectl port-forward svc/kubernetes-dashboard 8443:30081 -n kubernetes-dashboard --address 0.0.0.0
```

On your machine, go to the following URL and use your token from the previous steps to login.

```bash
https://<EC2_PUBLIC_IP>:8443
```

## Runbook Required Procedures

The following section contains all the procedures required for the runbook

### Open the Client

There are two ways to access the client:

1. If the client runs through an ALB, use the public domain
2. If ALB is not used, simply access it via the public IP - `http://<ec2_public_ip>:30080`

### Post a burst of queue jobs and watch KEDA scale BullMQ workers from zero to the cap and back to zero

Go to the client and post many jobs via the controls. Watch the pods from the K8 dashboard or via:

```bash
kubectl get pods -l app=bullmq-worker -n orch-109920256 -w
```

### Post an ephemeral job and show the orchestrator-created Kubernetes Job and Pod

Go to ALB domain and spam ephemeral jobs. Watch the pods from the K8 dashboard or via:

```bash
kubectl get pods -l app=ephemeral-worker -n orch-109920256 -w
```

### Prove the main server stays responsive during queue and ephemeral load

Open network tab and show that API is non-blocking when jobs are sent. Add `method:POST` in the browser network filter.

### Kill a BullMQ worker Pod mid-drain and show the queue job is retried or reclaimed

1. Run multiple longer running BullMQ jobs until it starts to scale (several pending jobs)
2. Get the BullMQ pods and kill them

```bash
kubectl annotate scaledobject bullmq-worker-scaler keda.sh/paused-replicas=0 -n orch-109920256 --overwrite && \
kubectl scale deployment bullmq-worker-deployment --replicas=0 -n orch-109920256 && \
kubectl delete pods -n orch-109920256 -l app=bullmq-worker --force --grace-period=0
```

3. Observe on the dashboard or K8 dashboard, or via

```bash
kubectl get pods -l -n orch-109920256 -w
```

### Inspect and explain the orchestrator RBAC. Prove it can create jobs in `orch-109920256` and prove it cannot act in any other space

Run the following checks

```bash
kubectl auth can-i create jobs.batch --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n orch-109920256
kubectl auth can-i create jobs.batch --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n default
kubectl auth can-i list pods --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n orch-109920256
```

Expected output is `yes`, then `no`, then `no`. The RoleBinding applies only to Pods running as `orchestrator-service-account-109920256`; other services in the namespace do not inherit it unless their Deployment explicitly sets the same `serviceAccountName`.

### Tear down the project and confirm no leftover resources remain

Run the following in `root` directory to ensure the project is torn down (except the EC2 instance):

```bash
sudo kind delete cluster --name clo835-109920256
sudo chown -R ubuntu:ubuntu terraform
terraform -chdir=terraform destroy -auto-approve -var-file=terraform.tfvars
```
