import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EvaluateImageRequestSchema } from '../schemas/validation';
import { VisionService } from '../services/vision-service';

export async function evaluateImageRoute(
  fastify: FastifyInstance
) {
  // description and tags are valid Fastify schema properties for OpenAPI docs
  const routeSchema = {
    description: 'Evaluate if an image contains a specific feature using AI vision',
    tags: ['vision'],
    body: {
      type: 'object',
      required: ['image_url', 'feature'],
      properties: {
        image_url: {
          type: 'string',
          format: 'uri',
          description: 'Publicly accessible URL to an image (JPG, PNG, WebP)',
        },
        feature: {
          type: 'string',
          description: 'The specific object, attribute, or concept to look for',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          exists: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          reasoning: { type: 'string' },
          status: { type: 'string', enum: ['success', 'error'] },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          status: { type: 'string', enum: ['error'] },
        },
      },
      500: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          status: { type: 'string', enum: ['error'] },
        },
      },
    },
  };

  fastify.post<{
    Body: { image_url: string; feature: string };
    Reply: {
      exists: boolean;
      confidence: number;
      reasoning: string;
      status: 'success' | 'error';
    };
  }>(
    '/evaluate-image',
    {
      schema: routeSchema as any, // Type assertion: description and tags are valid but not in TypeScript definitions
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Validate request body using Zod
        const validationResult = EvaluateImageRequestSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.status(400).send({
            error: validationResult.error.errors.map((e) => e.message).join(', '),
            status: 'error' as const,
          });
        }

        const { image_url, feature } = validationResult.data;

        // Get Anthropic API key from environment
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          fastify.log.error('ANTHROPIC_API_KEY environment variable is not set');
          return reply.status(500).send({
            error: 'Server configuration error: Anthropic API key not configured',
            status: 'error' as const,
          });
        }

        // Initialize vision service and analyze image
        const visionService = new VisionService(apiKey);
        const result = await visionService.evaluateImage(image_url, feature);

        return reply.status(200).send(result);
      } catch (error) {
        fastify.log.error(error, 'Error evaluating image');

        // Handle known error types
        if (error instanceof Error) {
          // Client errors (invalid URL, timeout, etc.)
          if (
            error.message.includes('fetch') ||
            error.message.includes('timeout') ||
            error.message.includes('HTTP') ||
            error.message.includes('format')
          ) {
            return reply.status(400).send({
              error: error.message,
              status: 'error' as const,
            });
          }

          // Server/AI errors
          return reply.status(500).send({
            error: error.message || 'An unexpected error occurred during image evaluation',
            status: 'error' as const,
          });
        }

        return reply.status(500).send({
          error: 'An unexpected error occurred',
          status: 'error' as const,
        });
      }
    }
  );
}
