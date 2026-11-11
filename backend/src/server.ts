import { buildApp } from "./app.js";
import { prisma } from "./db.js";
import { env, isGithubAuthEnabled, isGoogleAuthEnabled } from "./env.js";

async function start(): Promise<void> {
  const app = await buildApp();
  if (env.NODE_ENV === "development") {
    app.log.info(`Google OAuth provider: ${isGoogleAuthEnabled ? "enabled" : "disabled (missing credentials)"}`);
    app.log.info(`GitHub OAuth provider: ${isGithubAuthEnabled ? "enabled" : "disabled (missing credentials)"}`);
  }
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    app.log.info({ signal }, "Shutting down server");

    try {
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("unhandledRejection", (reason) => {
    app.log.fatal({ err: reason }, "Unhandled promise rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    app.log.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });

  try {
    const address = await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
    app.log.info(`Server listening at ${address}`);
  } catch (err) {
    app.log.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

void start();

