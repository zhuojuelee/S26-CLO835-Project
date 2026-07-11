# Runbook

This runbook contains the tested demo commands for the project.

## Bootstrapping

The bootstrap uses a mix of code from Lab 3 and includes the set up code for applying the deployments for the project.

```bash
# create script - vi ...
chmod +x bootstrap.sh
sudo ./bootstrap.sh <DEPLOY_DASHBOARD?> # Set DELOY_DASHBOARD to true if you want the Kubernetes Dashboard to be deployed
```

### [Optional] Getting Kubernetes Token and Accessing it via Port Forwarding

Get a token first by ssh into the EC2 instance and run this command:

```
kubectl -n kubernetes-dashboard create token admin-user
```

Ensure that your EC2's security group is setup to accept incoming traffic to port `8443`

Run the following in a new terminal, this will forward the port and it will continue to run.

```
kubectl port-forward svc/kubernetes-dashboard 8443:443 -n kubernetes-dashboard --address 0.0.0.0
```

On your machine, go to the following URL and use your token from the previous steps to login.

```
https://<EC2_PUBLIC_IP>:8443
```

## Runbook Required Procedures

The following section contains all the procedures required for the runbook

### Open the Client

There are two ways to access the client:

1. If the client runs through an ALB, use the public domain
2. If ALB is not used, simply access it via the public IP - `http://<ec2_public_ip>:30080`

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

1. Run a long running or multiple BullMQ jobs
2. Wait for it to scale up
3. Get the BullMQ pods - `for pod in $(kubectl get pods -l app=bullmq-worker -o jsonpath='{.items[*].metadata.name}'); do kubectl exec $pod -- kill -9 1 & done; wait; echo "All workers crashed."`
4. Observe on the dashboard and K8 dashboard

### Inspect and explain the orchestrator RBAC. Prove it can create jobs in `orch-109920256` and prove it cannot act in any other space

Run the following checks

```bash
kubectl auth can-i create jobs.batch --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n orch-109920256
kubectl auth can-i create jobs.batch --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n default
kubectl auth can-i list pods --as=system:serviceaccount:orch-109920256:orchestrator-service-account-109920256 -n orch-109920256
```

Expected output is `yes`, then `no`, then `no`. The RoleBinding applies only to Pods running as `orchestrator-service-account-109920256`; other services in the namespace do not inherit it unless their Deployment explicitly sets the same `serviceAccountName`.

### Tear down the project and confirm no leftover resources remain

Run `sudo kind delete cluster --name clo835-109920256`
