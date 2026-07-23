import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

/**
 * Initializes the Socket.io server layer on top of our existing HTTP engine.
 */
export function initSocket(server: HttpServer) {
  const configuredOrigins = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = [...new Set([ ...configuredOrigins, "http://localhost:3000" ])];

  io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS`));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 WebSocket Client Connected: ${socket.id}`);

    // Allow the frontend client to join a specific room named after the repository UUID
    socket.on("join-repo-room", (repositoryId: string) => {
      socket.join(repositoryId);
      console.log(
        `📁 Client ${socket.id} joined channel room for repo: ${repositoryId}`,
      );
    });

    socket.on("disconnect", () => {
      console.log(`🔌 WebSocket Client Disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Global getter to safely retrieve the operational socket instance across modules
 */
export function getIO(): SocketServer {
  if (!io) {
    throw new Error(
      "Socket.io engine has not been initialized within the current application scope.",
    );
  }
  return io;
}
