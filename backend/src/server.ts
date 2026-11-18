
import app from "./app";
import { db, initDatabase } from "./config/database";
import { env } from "./config/env";

async function startServer(): Promise<void> {
  try {
    await initDatabase();

    const server = app.listen(env.PORT, () => {
      console.log("------------------------------------");
      console.log("       TRUSTBRIDGE BACKEND");
      console.log("------------------------------------");
      console.log(`Server: http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend: ${env.FRONTEND_URL}`);
      console.log("------------------------------------");
    });

    function gracefulShutdown(signal: string): void {
      console.log(`\nReceived ${signal}. Closing server...`);

      server.close(() => {
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
