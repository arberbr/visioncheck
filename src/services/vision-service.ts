import axios from 'axios';
import { EvaluateImageResponse } from '../schemas/validation';

export interface VisionServiceConfig {
  apiKey: string;
  model?: string;
}

export class VisionService {
  private apiKey: string;
  private model: string;

  constructor(config: VisionServiceConfig) {
    this.apiKey = config.apiKey;
    // Default to free vision model: allenai/molmo-2-8b:free
    this.model = config.model || 'allenai/molmo-2-8b:free';
  }

  /**
   * Fetches an image from a URL and converts it to base64
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status === 200,
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      const base64 = Buffer.from(response.data).toString('base64');
      
      // Validate image format
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.some(type => contentType.includes(type))) {
        throw new Error(`Unsupported image format: ${contentType}. Supported formats: JPG, PNG, WebP`);
      }

      return base64;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Image fetch timeout: The image URL took too long to respond');
        }
        if (error.response) {
          throw new Error(`Failed to fetch image: HTTP ${error.response.status}`);
        }
        throw new Error(`Failed to fetch image: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Analyzes an image to determine if it contains the specified feature
   */
  async evaluateImage(
    imageUrl: string,
    feature: string
  ): Promise<EvaluateImageResponse> {
    try {
      // Fetch and convert image to base64
      const imageBase64 = await this.fetchImageAsBase64(imageUrl);

      // Determine content type from URL or default to jpeg
      const contentType = this.getContentType(imageUrl);

      // Construct the prompt for the vision model
      const prompt = this.buildPrompt(feature);

      // Create base64 data URL
      const dataUrl = `data:${contentType};base64,${imageBase64}`;

      // Call OpenRouter API
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://github.com',
            'X-Title': process.env.OPENROUTER_X_TITLE || 'VisionCheck',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from AI model');
      }

      return this.parseResponse(content);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorMessage = error.response.data?.error?.message || error.response.statusText;
          throw new Error(`OpenRouter API error: ${errorMessage}`);
        }
        throw new Error(`OpenRouter API request failed: ${error.message}`);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Vision analysis failed: ${String(error)}`);
    }
  }

  /**
   * Determines content type from image URL
   */
  private getContentType(imageUrl: string): string {
    if (imageUrl.toLowerCase().includes('.png')) {
      return 'image/png';
    } else if (imageUrl.toLowerCase().includes('.webp')) {
      return 'image/webp';
    }
    return 'image/jpeg';
  }

  /**
   * Builds the prompt for vision analysis
   */
  private buildPrompt(feature: string): string {
    return `Analyze this image carefully. Does it contain or show "${feature}"?

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
}`;
  }

  /**
   * Parses and validates the AI response
   */
  private parseResponse(content: string): EvaluateImageResponse {
    let parsedResponse: {
      exists: boolean;
      confidence: number;
      reasoning: string;
    };

    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      throw new Error(`Failed to parse AI response as JSON: ${content}`);
    }

    // Validate and normalize the response
    if (typeof parsedResponse.exists !== 'boolean') {
      throw new Error('AI response missing valid "exists" boolean field');
    }

    if (typeof parsedResponse.confidence !== 'number') {
      throw new Error('AI response missing valid "confidence" number field');
    }

    // Ensure confidence is between 0 and 1
    const confidence = Math.max(0, Math.min(1, parsedResponse.confidence));

    if (typeof parsedResponse.reasoning !== 'string') {
      throw new Error('AI response missing valid "reasoning" string field');
    }

    return {
      exists: parsedResponse.exists,
      confidence,
      reasoning: parsedResponse.reasoning.trim(),
      status: 'success',
    };
  }
}
