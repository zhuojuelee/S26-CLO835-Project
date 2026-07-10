import http from 'node:http';
import * as k8s from '@kubernetes/client-node';
import k8ApiClient from '../modules/k8/index.js';

export interface JobRunner {
  name: string; // internally readable name
  run(jobId: string, retryAttempt?: number): Promise<void>;
}

interface DockerCreateContainerResponse {
  Id: string;
  Warnings?: string[];
}

class LocalContainerJobRunner implements JobRunner {
  name = 'local-container';

  async run(jobId: string): Promise<void> {
    const image =
      process.env.EPHEMERAL_WORKER_IMAGE ??
      `${process.env.IMAGE_REPOSITORY_PREFIX ?? 'clo835-project'}/ephemeral-worker:${process.env.IMAGE_TAG ?? 'local'}`;
    const networkMode = process.env.LOCAL_DOCKER_NETWORK ?? 'clo835-project_default';
    const containerName = `ephemeral-worker-${jobId}-${Date.now()}`;
    const container = await dockerRequest<DockerCreateContainerResponse>(
      'POST',
      `/containers/create?name=${encodeURIComponent(containerName)}`,
      {
        Image: image,
        Env: [
          `JOB_ID=${jobId}`,
          `REDIS_HOST=${process.env.REDIS_HOST ?? 'redis'}`,
          `REDIS_PORT=${process.env.REDIS_PORT ?? '6379'}`,
        ],
        HostConfig: {
          AutoRemove: true,
          NetworkMode: networkMode,
        },
        Labels: {
          'clo835-project.job-id': jobId,
          'clo835-project.worker': 'ephemeral',
        },
      },
    );

    await dockerRequest('POST', `/containers/${container.Id}/start`);
    console.log(`started ephemeral worker container ${container.Id} for job ${jobId}`);
  }
}

class KubernetesJobRunner implements JobRunner {
  name = 'kubernetes-job';

  appLabel = 'ephemeral-worker';
  clusterNamespace = process.env.K8_NAMESPACE ?? 'orch-109920256';
  client = k8ApiClient;
  containerImage = ''; // TODO: update

  async run(jobId: string, retryAttempt: number): Promise<void> {
    const jobManifest: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: `ephemeral-worker-${jobId}-attempt${retryAttempt}`,
        namespace: this.clusterNamespace,
        labels: {
          app: this.appLabel,
        },
      },
      spec: {
        ttlSecondsAfterFinished: 15,
        backoffLimit: 0,
        template: {
          metadata: {
            labels: {
              app: this.appLabel,
            },
          },
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name: this.appLabel,
                image: this.containerImage,
                env: [
                  { name: 'JOB_ID', value: jobId },
                  { name: 'REDIS_HOST', value: process.env.REDIS_HOST },
                  { name: 'REDIS_PORT', value: process.env.REDIS_PORT },
                ],
              },
            ],
          },
        },
      },
    };

    await this.client!.createNamespacedJob({
      namespace: this.clusterNamespace,
      body: jobManifest,
    });
  }
}

export function getJobRunner(): JobRunner {
  if (process.env.JOB_RUNNER === 'kubernetes') {
    return new KubernetesJobRunner();
  }

  return new LocalContainerJobRunner();
}

async function dockerRequest<T = void>(method: 'POST', path: string, body?: unknown): Promise<T> {
  const socketPath = process.env.DOCKER_SOCKET_PATH ?? '/var/run/docker.sock';
  const requestBody = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        method,
        path,
        socketPath,
        headers: requestBody
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(requestBody),
            }
          : undefined,
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(responseBody || `Docker API failed with ${response.statusCode}`));
            return;
          }

          resolve(responseBody ? (JSON.parse(responseBody) as T) : (undefined as T));
        });
      },
    );

    request.on('error', reject);

    if (requestBody) {
      request.write(requestBody);
    }

    request.end();
  });
}
