import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

import { generateCommuteUpdate } from "./services/mockCommuteService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 5050;
const DEFAULT_HOST = "127.0.0.1";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5050",
  "http://127.0.0.1:5050",
];

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS."));
    },
  })
);

app.use(express.json());

let currentCommute = generateCommuteUpdate();
let updateInterval = null;
let serverStarted = false;

app.get("/api", (request, response) => {
  response.json({
    application: "Smart Mirror Commuter Sentiment",
    status: "running",
    health: "/api/health",
    websocket: "Socket.IO enabled",
  });
});

app.get("/api/health", (request, response) => {
  response.json({
    status: "success",
    message: "Smart Mirror backend is running.",
    websocketEnabled: true,
    connectedClients: io.engine.clientsCount,
  });
});

app.get("/api/commute/current", (request, response) => {
  response.json(currentCommute);
});

app.post("/api/commute/refresh", (request, response) => {
  currentCommute = generateCommuteUpdate();
  io.emit("commute:update", currentCommute);

  response.json({
    status: "success",
    commute: currentCommute,
  });
});

io.on("connection", (socket) => {
  console.log(`Dashboard connected: ${socket.id}`);

  socket.emit("commute:update", currentCommute);

  socket.on("commute:refresh", () => {
    currentCommute = generateCommuteUpdate();
    io.emit("commute:update", currentCommute);
  });

  socket.on("disconnect", () => {
    console.log(`Dashboard disconnected: ${socket.id}`);
  });
});

/*
 * Serve the compiled React application.
 * API routes must remain above this section.
 */
const frontendPath = path.join(__dirname, "public");
const indexFile = path.join(frontendPath, "index.html");

app.use(express.static(frontendPath));

app.use((request, response, next) => {
  const isFrontendRequest =
    request.method === "GET" &&
    !request.path.startsWith("/api/") &&
    !request.path.startsWith("/socket.io/");

  if (isFrontendRequest) {
    response.sendFile(indexFile);
    return;
  }

  next();
});

function beginLiveUpdates() {
  if (updateInterval) {
    return;
  }

  updateInterval = setInterval(() => {
    currentCommute = generateCommuteUpdate();
    io.emit("commute:update", currentCommute);

    console.log(
      `Live update: Misery Index ${currentCommute.miseryIndex.score}/10`
    );
  }, 5000);
}

export function startServer({
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
} = {}) {
  if (serverStarted) {
    return Promise.resolve(httpServer);
  }

  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      httpServer.off("listening", handleListening);
      reject(error);
    };

    const handleListening = () => {
      httpServer.off("error", handleError);
      serverStarted = true;
      beginLiveUpdates();

      console.log();
      console.log(
        `Smart Mirror running at http://${host}:${port}`
      );
      console.log();

      resolve(httpServer);
    };

    httpServer.once("error", handleError);
    httpServer.once("listening", handleListening);
    httpServer.listen(port, host);
  });
}

export function stopServer() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (!serverStarted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    io.close(() => {
      httpServer.close(() => {
        serverStarted = false;
        resolve();
      });
    });
  });
}

const runningDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === __filename;

if (runningDirectly) {
  startServer().catch((error) => {
    console.error("The Smart Mirror server could not start.");
    console.error(error);
    process.exit(1);
  });
}
