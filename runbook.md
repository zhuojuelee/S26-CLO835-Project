# Runbook

This runbook will contain the tested, copy-pasteable demo commands for the CLO835 async orchestration project.

## Required Procedures

- Post a burst of queue jobs and watch KEDA scale BullMQ workers from zero to the cap and back to zero.
- Post an ephemeral job and show the orchestrator-created Kubernetes Job and Pod.
- Prove the main server stays responsive during queue and ephemeral load.
- Kill a BullMQ worker Pod mid-drain and show the queue job is retried or reclaimed.
- Inspect orchestrator RBAC and prove it is namespace-scoped.
- Tear down the project and confirm no leftover resources remain.
