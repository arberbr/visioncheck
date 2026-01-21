import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "dotenv";
import Fastify from "fastify";
import { evaluateImageRoute } from "@/routes/evaluate-image";
import { healthRoute } from "@/routes/health";

config();

/**
 * Validates and returns the PORT number from environment variables.
 * @throws {Error} If PORT is invalid
 */
function getPort(): number {
  const portStr = process.env.PORT || "3000";
  const port = Number.parseInt(portStr, 10);

  if (Number.isNaN(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${portStr}. Must be a number between 1 and 65535.`);
  }

  return port;
}

/**
 * Validates and returns the HOST from environment variables.
 */
function getHost(): string {
  const host = process.env.HOST || "127.0.0.1";
  if (typeof host !== "string" || host.trim() === "") {
    throw new Error("HOST environment variable must be a non-empty string");
  }
  return host;
}

const PORT = getPort();
const HOST = getHost();

/**
 * Builds and configures the Fastify server instance.
 *
 * Sets up logging, CORS, rate limiting, and registers all routes.
 *
 * @returns A configured Fastify server instance
 */
export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            },
    },
    bodyLimit: 1024 * 1024, // 1MB request body limit
    requestTimeout: 60_000, // 60 second request timeout
  });

  // CORS configuration with whitelist support
  const corsOrigin = process.env.CORS_ORIGIN;
  await fastify.register(cors, {
    origin: corsOrigin ? corsOrigin.split(",").map((origin) => origin.trim()) : true, // Allow all if not specified
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: Number.parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // requests
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  });

  await fastify.register(healthRoute);
  await fastify.register(evaluateImageRoute);

  return fastify;
}

/**
 * Starts the HTTP server and begins listening for requests.
 *
 * Checks for required environment variables and logs server information.
 * Exits the process if server startup fails.
 */
async function start() {
  let server: Awaited<ReturnType<typeof buildServer>> | null = null;

  try {
    server = await buildServer();

    const model = process.env.OPENROUTER_MODEL || "allenai/molmo-2-8b:free";
    if (process.env.OPENROUTER_API_KEY) {
      server.log.info(`Using OpenRouter API with model: ${model}`);
    } else {
      server.log.warn(
        "WARNING: OPENROUTER_API_KEY environment variable is not set. The service will not function without it."
      );
    }

    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Health check: http://${HOST}:${PORT}/health`);
    server.log.info(`Evaluate image: POST http://${HOST}:${PORT}/evaluate-image`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    if (!server) {
      return;
    }

    server.log.info(`Received ${signal}, closing server gracefully...`);
    try {
      await server.close();
      server.log.info("Server closed successfully");
      process.exit(0);
    } catch (err) {
      server.log.error(err, "Error during server shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Only start the server if not in test environment
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  start();
}
