import express from "express";
import cors from "cors";

import http from "http";
import dotenv from "dotenv";
import { initQdrant } from "./config/qdrant";
import { startRepoWorker } from "./workers/repoWorker";

const app = express();

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "healthy", message: "Server is running " });
});

async function startServer() {
  await initQdrant();

  startRepoWorker();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
