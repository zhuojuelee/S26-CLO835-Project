import cors from 'cors';
import express from 'express';
import { Redis } from 'ioredis';
import {
  JOB_KEY_PREFIX,
  type CreateJobResponse,
  type CreateQueueJobRequest,
  type DeleteJobsResponse,
  type HealthResponse,
  type JobRecord,
  type JobsResponse,
  type RuntimeConfigResponse,
} from '@clo835-project/shared';

const port = Number(process.env.MAIN_SERVER_PORT ?? process.env.PORT ?? 3000);
const serviceName = 'main-server';
const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const orchestratorUrl = process.env.ORCHESTRATOR_URL ?? 'http://localhost:3001';
const adminSecret = process.env.ADMIN_SECRET;
const ec2PublicIp = process.env.EC2_PUBLIC_IP;

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

const app = express();
app.use(cors());
app.use(express.json());

async function scanJobKeys(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, foundKeys] = await redis.scan(cursor, 'MATCH', `${JOB_KEY_PREFIX}*`, 'COUNT', 100);

    cursor = nextCursor;
    keys.push(...foundKeys);
  } while (cursor !== '0');

  return keys;
}

app.get('/health', async (_request, response) => {
  let redisOk = false;

  try {
    await redis.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  const body: HealthResponse = {
    service: serviceName,
    ok: redisOk,
    timestamp: new Date().toISOString(),
  };

  response.status(redisOk ? 200 : 503).json(body);
});

app.get('/jobs', async (_request, response) => {
  try {
    const keys = await scanJobKeys();

    if (keys.length === 0) {
      response.json([]);
      return;
    }

    const values = await redis.mget(keys);
    const jobs: Array<{ key: string; record: JobRecord }> = [];

    for (const [index, value] of values.entries()) {
      if (!value) {
        continue;
      }

      jobs.push({
        key: keys[index],
        record: JSON.parse(value) as JobRecord,
      });
    }

    jobs.sort((a, b) => b.record.createdAt - a.record.createdAt);

    const body: JobsResponse = jobs.map(({ key, record }) => ({
      [key]: record,
    }));

    response.json(body);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to read jobs',
    });
  }
});

app.get('/runtime-config', (_request, response) => {
  const body: RuntimeConfigResponse = {
    ec2PublicIp: ec2PublicIp || null,
  };

  response.json(body);
});

app.delete('/jobs', async (request, response) => {
  if (!adminSecret || request.header('x-admin-secret') !== adminSecret) {
    response.status(403).json({
      error: 'Admin access required',
    });
    return;
  }

  try {
    const keys = await scanJobKeys();

    if (keys.length === 0) {
      const body: DeleteJobsResponse = {
        deleted: 0,
      };

      response.json(body);
      return;
    }

    const deleted = await redis.del(...keys);
    const body: DeleteJobsResponse = {
      deleted,
    };

    response.json(body);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete jobs',
    });
  }
});

app.post('/jobs', async (request, response) => {
  const body = request.body as Partial<CreateQueueJobRequest>;
  const durationSeconds = Number(body.durationSeconds);
  const message = body.message?.trim();
  const jobType = body.jobType;

  if (!Number.isFinite(durationSeconds) || !message || !jobType) {
    response.status(400).json({
      error: 'durationSeconds, message, and jobType are required',
    });
    return;
  }

  try {
    const orchestratorEndpoint = jobType === 'ephemeral' ? 'spawnJob' : 'queueJob';
    const orchestratorResponse = await fetch(`${orchestratorUrl}/${orchestratorEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        durationSeconds,
        message,
        jobType,
      } satisfies CreateQueueJobRequest),
    });
    const responseText = await orchestratorResponse.text();
    const responseBody = responseText
      ? (JSON.parse(responseText) as CreateJobResponse | { error: string })
      : {};

    response.status(orchestratorResponse.status).json(responseBody);
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to queue job',
    });
  }
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
