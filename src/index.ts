import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { evaluateImageRoute } from './routes/evaluate-image';
import { healthRoute } from './routes/health';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

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

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in PoC (configure appropriately for production)
  });

  // Register routes
  await fastify.register(healthRoute);
  await fastify.register(evaluateImageRoute);

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();

    // Check for required environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
      server.log.warn(
        'WARNING: ANTHROPIC_API_KEY environment variable is not set. The service will not function without it.'
      );
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
