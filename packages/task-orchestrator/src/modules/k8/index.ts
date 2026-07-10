import * as k8s from '@kubernetes/client-node';

function createK8ApiClient() {
  const kubeConfig = new k8s.KubeConfig();
  kubeConfig.loadFromDefault();

  return kubeConfig.makeApiClient(k8s.BatchV1Api);
}

const k8ApiClient = process.env.JOB_RUNNER === 'kubernetes' ? createK8ApiClient() : undefined;

export default k8ApiClient;
