import { FastifyInstance } from 'fastify';

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
              time: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: 'ok',
        service: 'visioncheck-poc',
        time: new Date().toISOString(),
      };
    }
  );
}

