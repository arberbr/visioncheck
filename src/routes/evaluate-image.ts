import type { FastifyInstance, FastifyReply, FastifyRequest, RouteShorthandOptions } from "fastify";
import { EvaluateImageRequestSchema } from "@/schemas/validation";
import { VisionService } from "@/services/vision-service";
import { validateImageUrl } from "@/utils/url-validator";

/**
 * Registers the /evaluate-image POST route for image feature detection.
 *
 * This route accepts an image URL and feature description, then uses AI vision
 * to determine if the feature exists in the image.
 *
 * @param fastify - The Fastify instance to register the route on
 *
 * @example
 * POST /evaluate-image
 * Body: { "image_url": "https://example.com/image.jpg", "feature": "a dog" }
 */
export async function evaluateImageRoute(fastify: FastifyInstance) {
  const routeSchema = {
    description: "Evaluate if an image contains a specific feature using AI vision",
    tags: ["vision"],
    body: {
      type: "object",
      required: ["image_url", "feature"],
      properties: {
        image_url: {
          type: "string",
          format: "uri",
          description: "Publicly accessible URL to an image (JPG, PNG, WebP)",
        },
        feature: {
          type: "string",
          description: "The specific object, attribute, or concept to look for",
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          exists: { type: "boolean" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
          status: { type: "string", enum: ["success", "error"] },
        },
      },
      400: {
        type: "object",
        properties: {
          error: { type: "string" },
          status: { type: "string", enum: ["error"] },
        },
      },
      500: {
        type: "object",
        properties: {
          error: { type: "string" },
          status: { type: "string", enum: ["error"] },
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
      status: "success" | "error";
    };
  }>(
    "/evaluate-image",
    {
      schema: routeSchema,
    } as RouteShorthandOptions,
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validationResult = EvaluateImageRequestSchema.safeParse(request.body);

        if (!validationResult.success) {
          return reply.status(400).send({
            error: validationResult.error.errors.map((e) => e.message).join(", "),
            status: "error" as const,
          });
        }

        const { image_url, feature } = validationResult.data;

        // Validate image URL for SSRF and domain whitelist
        const allowedDomains = process.env.ALLOWED_IMAGE_DOMAINS;
        const urlValidation = validateImageUrl(image_url, allowedDomains);
        if (!urlValidation.isValid) {
          return reply.status(400).send({
            error: urlValidation.error || "Invalid image URL",
            status: "error" as const,
          });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey || apiKey.trim() === "") {
          fastify.log.error("OPENROUTER_API_KEY environment variable is not set");
          return reply.status(500).send({
            error: "Server configuration error: OpenRouter API key not configured",
            status: "error" as const,
          });
        }

        const model = process.env.OPENROUTER_MODEL;
        const visionService = new VisionService({
          apiKey,
          model,
        });

        const startTime = Date.now();
        const result = await visionService.evaluateImage(image_url, feature);
        const duration = Date.now() - startTime;

        fastify.log.info(
          {
            imageUrl: image_url,
            feature,
            duration,
            exists: result.exists,
            confidence: result.confidence,
          },
          "Image evaluation completed"
        );

        return reply.status(200).send(result);
      } catch (error) {
        const body = request.body as { image_url?: string; feature?: string } | undefined;
        fastify.log.error(
          {
            error,
            imageUrl: body?.image_url,
            feature: body?.feature,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
          },
          "Error evaluating image"
        );

        if (error instanceof Error) {
          if (
            error.message.includes("fetch") ||
            error.message.includes("timeout") ||
            error.message.includes("HTTP") ||
            error.message.includes("format")
          ) {
            return reply.status(400).send({
              error: error.message,
              status: "error" as const,
            });
          }

          return reply.status(500).send({
            error: error.message || "An unexpected error occurred during image evaluation",
            status: "error" as const,
          });
        }

        return reply.status(500).send({
          error: "An unexpected error occurred",
          status: "error" as const,
        });
      }
    }
  );
}
