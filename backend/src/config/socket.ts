import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { isOriginAllowed } from "../server";

let io: SocketServer | null = null;

/**
 * Initializes the Socket.io server layer on top of our existing HTTP engine.
 */
export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
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
