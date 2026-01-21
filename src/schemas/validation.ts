import { z } from "zod";

/**
 * Zod schema for validating the evaluate-image request body.
 *
 * Validates that image_url is a valid HTTP/HTTPS URL and feature is a non-empty string (max 500 chars).
 * SSRF protection and domain whitelist validation are performed during request processing.
 */
export const EvaluateImageRequestSchema = z.object({
  image_url: z
    .string()
    .url("image_url must be a valid URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "image_url must be a valid HTTP/HTTPS URL" }
    ),
  feature: z
    .string()
    .min(1, "feature description cannot be empty")
    .max(500, "feature description is too long"),
});

/**
 * TypeScript type inferred from EvaluateImageRequestSchema.
 */
export type EvaluateImageRequest = z.infer<typeof EvaluateImageRequestSchema>;

/**
 * Zod schema for validating the evaluate-image response.
 *
 * Ensures exists is boolean, confidence is between 0-1, and reasoning is a string.
 */
export const EvaluateImageResponseSchema = z.object({
  exists: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  status: z.enum(["success", "error"]),
});

/**
 * TypeScript type inferred from EvaluateImageResponseSchema.
 */
export type EvaluateImageResponse = z.infer<typeof EvaluateImageResponseSchema>;
