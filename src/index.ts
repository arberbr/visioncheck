import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { evaluateImageRoute } from '@/routes/evaluate-image';
import { healthRoute } from '@/routes/health';

config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

/**
 * Builds and configures the Fastify server instance.
 * 
 * Sets up logging, CORS, and registers all routes.
 * 
 * @returns A configured Fastify server instance
 */
async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
        },
  });

  await fastify.register(cors, {
    origin: true,
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
  try {
    const server = await buildServer();

    if (!process.env.OPENROUTER_API_KEY) {
      server.log.warn(
        'WARNING: OPENROUTER_API_KEY environment variable is not set. The service will not function without it.'
      );
    } else {
      server.log.info('Using OpenRouter API with model: allenai/molmo-2-8b:free');
    }

    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Health check: http://${HOST}:${PORT}/health`);
    server.log.info(`Evaluate image: POST http://${HOST}:${PORT}/evaluate-image`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
