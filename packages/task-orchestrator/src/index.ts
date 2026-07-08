import cors from "cors";
import express from "express";
import type { HealthResponse } from "@clo835-project/shared";

const port = Number(process.env.PORT ?? 3001);
const serviceName = "task-orchestrator";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  const body: HealthResponse = {
    service: serviceName,
    ok: true,
    timestamp: new Date().toISOString()
  };

  response.json(body);
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});
