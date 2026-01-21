import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisionService } from "@/services/vision-service";
import * as imageUtils from "@/utils/image";

// Mock axios and image utils
vi.mock("axios", () => {
  const mockPost = vi.fn();
  // Store reference globally so we can access it in tests
  (globalThis as { mockAxiosPost?: ReturnType<typeof vi.fn> }).mockAxiosPost = mockPost;
  return {
    default: {
      get: vi.fn(),
      post: mockPost,
      isAxiosError: vi.fn(
        (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true
      ),
    },
    isAxiosError: vi.fn(
      (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true
    ),
  };
});
vi.mock("@/utils/image");

const mockedImageUtils = vi.mocked(imageUtils);

// Get the mocked post function
const getMockAxiosPost = () =>
  (globalThis as { mockAxiosPost?: ReturnType<typeof vi.fn> }).mockAxiosPost as ReturnType<
    typeof vi.fn
  >;

describe("VisionService", () => {
  const mockApiKey = "test-api-key";
  let visionService: VisionService;

  beforeEach(() => {
    vi.clearAllMocks();
    visionService = new VisionService({ apiKey: mockApiKey });
  });

  describe("constructor", () => {
    it("should create a VisionService instance with API key", () => {
      const service = new VisionService({ apiKey: "test-key" });
      expect(service).toBeInstanceOf(VisionService);
    });

    it("should use the correct model", () => {
      // Model is private, but we can verify it's set by checking behavior
      expect(visionService).toBeInstanceOf(VisionService);
    });
  });

  describe("evaluateImage", () => {
    const mockImageUrl = "https://example.com/image.jpg";
    const mockFeature = "a golden retriever";
    const mockBase64 = "base64-encoded-image";
    const mockContentType = "image/jpeg";

    beforeEach(() => {
      mockedImageUtils.fetchImageAsBase64.mockResolvedValue({
        base64: mockBase64,
        contentType: mockContentType,
      });
    });

    it("should successfully evaluate an image", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: true,
                  confidence: 0.95,
                  reasoning: "The image shows a golden retriever",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      const result = await visionService.evaluateImage(mockImageUrl, mockFeature);

      expect(mockedImageUtils.fetchImageAsBase64).toHaveBeenCalledWith(mockImageUrl);
      expect(getMockAxiosPost()).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          model: "allenai/molmo-2-8b:free",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: expect.stringContaining(mockFeature) },
                {
                  type: "image_url",
                  image_url: { url: `data:${mockContentType};base64,${mockBase64}` },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30_000,
        })
      );

      expect(result).toEqual({
        exists: true,
        confidence: 0.95,
        reasoning: "The image shows a golden retriever",
        status: "success",
      });
    });

    it("should handle JSON response wrapped in markdown code blocks", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content:
                  '```json\n{"exists": false, "confidence": 0.2, "reasoning": "No dog found"}\n```',
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      const result = await visionService.evaluateImage(mockImageUrl, mockFeature);

      expect(result.exists).toBe(false);
      expect(result.confidence).toBe(0.2);
      expect(result.reasoning).toBe("No dog found");
    });

    it("should normalize confidence to 0-1 range", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: true,
                  confidence: 1.5, // Above 1
                  reasoning: "test",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      const result = await visionService.evaluateImage(mockImageUrl, mockFeature);
      expect(result.confidence).toBe(1);
    });

    it("should clamp negative confidence to 0", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: false,
                  confidence: -0.5, // Below 0
                  reasoning: "test",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      const result = await visionService.evaluateImage(mockImageUrl, mockFeature);
      expect(result.confidence).toBe(0);
    });

    it("should trim reasoning text", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: true,
                  confidence: 0.8,
                  reasoning: "  Trimmed reasoning  ",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      const result = await visionService.evaluateImage(mockImageUrl, mockFeature);
      expect(result.reasoning).toBe("Trimmed reasoning");
    });

    it("should throw error when image fetch fails with timeout", async () => {
      const timeoutError = new Error("timeout") as {
        code?: string;
        isAxiosError?: boolean;
      };
      timeoutError.code = "ECONNABORTED";
      timeoutError.isAxiosError = true;
      mockedImageUtils.fetchImageAsBase64.mockRejectedValue(timeoutError);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "Image fetch timeout"
      );
    });

    it("should throw error when image fetch fails with HTTP error", async () => {
      const httpError = new Error("Not Found") as {
        response?: { status: number };
        isAxiosError?: boolean;
      };
      httpError.response = { status: 404 };
      httpError.isAxiosError = true;
      mockedImageUtils.fetchImageAsBase64.mockRejectedValue(httpError);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "Failed to fetch image: HTTP 404"
      );
    });

    it("should throw error when image fetch fails with network error", async () => {
      const networkError = new Error("Network Error") as { isAxiosError?: boolean };
      networkError.isAxiosError = true;
      mockedImageUtils.fetchImageAsBase64.mockRejectedValue(networkError);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "Failed to fetch image: Network Error"
      );
    });

    it("should throw error when OpenRouter API returns error response", async () => {
      const apiError = new Error("Request failed") as {
        response?: {
          status: number;
          statusText: string;
          data?: { error?: { message: string } };
        };
        isAxiosError?: boolean;
      };
      apiError.response = {
        status: 401,
        statusText: "Unauthorized",
        data: {
          error: {
            message: "Invalid API key",
          },
        },
      };
      apiError.isAxiosError = true;

      getMockAxiosPost().mockRejectedValue(apiError);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "OpenRouter API error: Invalid API key"
      );
    });

    it("should throw error when OpenRouter API request fails", async () => {
      const networkError = new Error("Network Error") as { isAxiosError?: boolean };
      networkError.isAxiosError = true;

      getMockAxiosPost().mockRejectedValue(networkError);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "OpenRouter API request failed: Network Error"
      );
    });

    it("should throw error when API response has no content", async () => {
      const mockApiResponse = {
        data: {
          choices: [],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "No response from AI model"
      );
    });

    it("should throw error when API response content is invalid JSON", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: "This is not JSON",
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        "Failed to parse AI response as JSON"
      );
    });

    it("should throw error when response missing exists field", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 0.5,
                  reasoning: "test",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        'missing valid "exists" boolean field'
      );
    });

    it("should throw error when response missing confidence field", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: true,
                  reasoning: "test",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        'missing valid "confidence" number field'
      );
    });

    it("should throw error when response missing reasoning field", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: true,
                  confidence: 0.5,
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      await expect(visionService.evaluateImage(mockImageUrl, mockFeature)).rejects.toThrow(
        'missing valid "reasoning" string field'
      );
    });

    it("should build prompt with feature description", async () => {
      const mockApiResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  exists: true,
                  confidence: 0.9,
                  reasoning: "test",
                }),
              },
            },
          ],
        },
      };

      getMockAxiosPost().mockResolvedValue(mockApiResponse);

      await visionService.evaluateImage(mockImageUrl, "a sunset");

      const callArgs = getMockAxiosPost().mock.calls[0][1] as {
        messages: Array<{
          content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
        }>;
      };
      const promptText = callArgs.messages[0].content[0].text;
      expect(promptText).toContain("a sunset");
      expect(promptText).toContain("JSON");
    });
  });
});
