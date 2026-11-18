import http from "http";
import app from "./app";
import { db, initDatabase } from "./config/database";
import { env } from "./config/env";
import { initSocketServer } from "./socket";

async function startServer(): Promise<void> {
  try {
    await initDatabase();

    const httpServer = http.createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(env.PORT, "0.0.0.0", () => {
      console.log("------------------------------------");
      console.log("       TRUSTBRIDGE PLATFORM");
      console.log("------------------------------------");
      console.log(`Server: http://0.0.0.0:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Socket.IO: active on same port`);
      console.log("------------------------------------");
    });

    function gracefulShutdown(signal: string): void {
      console.log(`\nReceived ${signal}. Closing server...`);

      httpServer.close(() => {
        try {
          db.close();
          console.log("Database connection closed.");
        } catch (error) {
          console.error("Database shutdown error:", error);
        }

        process.exit(0);
      });
    }

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start TrustBridge:", error);
    process.exitCode = 1;
  }
}

void startServer();
