import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { EvaluateImageResponse } from '../schemas/validation';

export class VisionService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
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
      let contentType = 'image/jpeg';
      if (imageUrl.toLowerCase().includes('.png')) {
        contentType = 'image/png';
      } else if (imageUrl.toLowerCase().includes('.webp')) {
        contentType = 'image/webp';
      }

      // Construct the prompt for the vision model
      const prompt = `Analyze this image carefully. Does it contain or show "${feature}"?

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

      // Call Anthropic Claude Haiku Vision API
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent results
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: contentType as 'image/jpeg' | 'image/png' | 'image/webp',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract text content from response
      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : null;
      
      if (!content) {
        throw new Error('No response from AI model');
      }

      // Parse the JSON response
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
    } catch (error) {
      // Re-throw with more context if it's already a known error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Vision analysis failed: ${String(error)}`);
    }
  }
}
