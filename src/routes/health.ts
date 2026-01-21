import type { FastifyInstance } from "fastify";

/**
 * Registers the /health GET route for service health checks.
 *
 * Returns the current status, service name, and timestamp.
 *
 * @param fastify - The Fastify instance to register the route on
 *
 * @example
 * GET /health
 * Response: { "status": "ok", "service": "visioncheck-poc", "time": "2024-01-01T12:00:00.000Z" }
 */
export async function healthRoute(fastify: FastifyInstance) {
  fastify.get(
    "/health",
    {
      schema: {
        description: "Health check endpoint",
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              time: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: "ok",
        service: "visioncheck-poc",
        time: new Date().toISOString(),
      };
    }
  );
}
