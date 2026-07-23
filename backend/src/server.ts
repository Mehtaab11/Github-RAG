import express from "express";
import cors from "cors";

import http from "http";
import dotenv from "dotenv";
import "./config/jwt"; // Validates JWT_SECRET presence on startup
import { initQdrant } from "./config/qdrant";
import { startRepoWorker } from "./workers/repoWorker";
import repoRoutes from "./routes/repoRoutes";
import chatRoutes from "./routes/chatRoutes";
import authRoutes from "./routes/authRoutes";
import { initSocket } from "./config/socket";
const app = express();

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .concat("http://localhost:3000");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

app.use("/api/repositories", repoRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", message: "Server is running " });
});

async function startServer() {
  await initQdrant();

  initSocket(server);

  startRepoWorker();

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
