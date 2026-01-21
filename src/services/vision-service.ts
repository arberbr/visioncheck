import axios from "axios";
import type { EvaluateImageResponse } from "@/schemas/validation";
import { fetchImageAsBase64 } from "@/utils/image";

/**
 * Configuration interface for VisionService.
 */
export interface VisionServiceConfig {
  /** OpenRouter API key for authentication */
  apiKey: string;
  /** Optional model name (defaults to allenai/molmo-2-8b:free) */
  model?: string;
}

/**
 * Service for analyzing images using AI vision models via OpenRouter API.
 *
 * This service fetches images from URLs, converts them to base64, and sends them
 * to OpenRouter's vision API to determine if specific features are present.
 */
export class VisionService {
  private apiKey: string;
  private readonly model: string;

  /**
   * Creates a new instance of VisionService.
   *
   * @param config - Configuration object containing the OpenRouter API key and optional model
   */
  constructor(config: VisionServiceConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "allenai/molmo-2-8b:free";
  }

  /**
   * Analyzes an image to determine if it contains the specified feature.
   *
   * @param imageUrl - The publicly accessible URL of the image to analyze
   * @param feature - The specific object, attribute, or concept to look for in the image
   * @returns A promise that resolves to an evaluation result with exists, confidence, and reasoning
   * @throws {Error} If image fetching fails, API request fails, or response parsing fails
   *
   * @example
   * ```typescript
   * const result = await visionService.evaluateImage(
   *   'https://example.com/dog.jpg',
   *   'a golden retriever'
   * );
   * // result.exists will be true or false
   * ```
   */
  async evaluateImage(imageUrl: string, feature: string): Promise<EvaluateImageResponse> {
    const { base64: imageBase64, contentType } = await fetchImageAsBase64(imageUrl).catch(
      (error: unknown) => {
        if (axios.isAxiosError(error)) {
          if (error.code === "ECONNABORTED") {
            throw new Error("Image fetch timeout: The image URL took too long to respond");
          }
          if (error.response) {
            throw new Error(`Failed to fetch image: HTTP ${error.response.status}`);
          }
          throw new Error(`Failed to fetch image: ${error.message}`);
        }
        throw error;
      }
    );

    const dataUrl = `data:${contentType};base64,${imageBase64}`;

    const response = await axios
      .post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: this.buildPrompt(feature) },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30_000,
        }
      )
      .catch((error) => {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            const errorMessage = error.response.data?.error?.message || error.response.statusText;
            throw new Error(`OpenRouter API error: ${errorMessage}`);
          }
          throw new Error(`OpenRouter API request failed: ${error.message}`);
        }
        throw error;
      });

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI model");
    }

    return this.parseResponse(content);
  }

  /**
   * Builds the prompt text for the vision model analysis.
   *
   * @param feature - The feature to search for in the image
   * @returns The formatted prompt string instructing the model how to analyze the image
   */
  private buildPrompt(feature: string): string {
    return `
      Analyze this image carefully. Does it contain or show "${feature}"?
      Consider:
      - Exact matches (e.g., if asked for "a golden retriever" and the image shows a golden retriever)
      - Fuzzy matches (e.g., if asked for "a vehicle" and the image shows a car, truck, or motorcycle)
      - Partial matches (e.g., if asked for "person" and the image shows a person)
      - Contextual relevance (e.g., if asked for "sunset" and the image shows a sunset scene)
      Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks, just pure JSON):
      {
        "exists": true or false,
        "confidence": a number between 0.0 and 1.0,
        "reasoning": "a brief explanation of why you reached this conclusion"
      }
    `;
  }

  /**
   * Parses and validates the AI model's JSON response.
   *
   * @param content - The raw text content from the AI model response
   * @returns A validated EvaluateImageResponse object
   * @throws {Error} If the response cannot be parsed as JSON or missing required fields
   */
  private parseResponse(content: string): EvaluateImageResponse {
    const cleanedContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsedResponse: { exists: boolean; confidence: number; reasoning: string };
    try {
      parsedResponse = JSON.parse(cleanedContent);
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${content}`);
    }

    if (typeof parsedResponse.exists !== "boolean") {
      throw new Error('AI response missing valid "exists" boolean field');
    }
    if (typeof parsedResponse.confidence !== "number") {
      throw new Error('AI response missing valid "confidence" number field');
    }
    if (typeof parsedResponse.reasoning !== "string") {
      throw new Error('AI response missing valid "reasoning" string field');
    }

    return {
      exists: parsedResponse.exists,
      confidence: Math.max(0, Math.min(1, parsedResponse.confidence)),
      reasoning: parsedResponse.reasoning.trim(),
      status: "success",
    };
  }
}
