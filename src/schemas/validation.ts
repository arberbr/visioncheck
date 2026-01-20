import { z } from 'zod';

/**
 * Schema for the POST /evaluate-image request body
 */
export const EvaluateImageRequestSchema = z.object({
  image_url: z
    .string()
    .url('image_url must be a valid URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'image_url must be a valid HTTP/HTTPS URL' }
    ),
  feature: z
    .string()
    .min(1, 'feature description cannot be empty')
    .max(500, 'feature description is too long'),
});

export type EvaluateImageRequest = z.infer<typeof EvaluateImageRequestSchema>;

/**
 * Schema for the API response
 */
export const EvaluateImageResponseSchema = z.object({
  exists: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  status: z.enum(['success', 'error']),
});

export type EvaluateImageResponse = z.infer<typeof EvaluateImageResponseSchema>;
