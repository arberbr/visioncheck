import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateImageRoute } from "@/routes/evaluate-image";
import { VisionService } from "@/services/vision-service";

// Mock VisionService
vi.mock("@/services/vision-service", () => {
  const VisionServiceMock = vi.fn();
  return {
    VisionService: VisionServiceMock,
  };
});

describe("Evaluate Image Route", () => {
  let app: FastifyInstance;
  const mockApiKey = "test-api-key";

  beforeEach(async () => {
    // Set environment variable
    process.env.OPENROUTER_API_KEY = mockApiKey;

    app = Fastify();
    await app.register(evaluateImageRoute);
    await app.ready();
  });

  afterEach(async () => {
    process.env.OPENROUTER_API_KEY = undefined;
    vi.clearAllMocks();
    await app.close();
  });

  describe("POST /evaluate-image", () => {
    it("should successfully evaluate an image", async () => {
      const mockResult = {
        exists: true,
        confidence: 0.95,
        reasoning: "The image shows a golden retriever",
        status: "success" as const,
      };

      const mockEvaluateImage = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a golden retriever",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockResult);
    });

    it("should return 400 for invalid image URL", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "not-a-url",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      // Fastify schema validation returns different format than Zod validation
      // Check that we get a 400 error response
      expect(body).toHaveProperty("error");
      // The error might be from Fastify schema validation or Zod validation
      expect(typeof body.error).toBe("string");
    });

    it("should return 400 for non-HTTP/HTTPS URL", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "ftp://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("HTTP/HTTPS");
    });

    it("should return 400 for empty feature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("cannot be empty");
    });

    it("should return 400 for feature longer than 500 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a".repeat(501),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("too long");
    });

    it("should return 500 when API key is missing", async () => {
      process.env.OPENROUTER_API_KEY = "";

      const appWithoutKey = Fastify();
      await appWithoutKey.register(evaluateImageRoute);
      await appWithoutKey.ready();

      const response = await appWithoutKey.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("API key not configured");

      await appWithoutKey.close();
    });

    it("should return 400 for image fetch errors", async () => {
      const mockError = new Error("Failed to fetch image: HTTP 404");
      const mockEvaluateImage = vi.fn().mockRejectedValue(mockError);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("fetch");
    });

    it("should return 400 for timeout errors", async () => {
      const mockError = new Error("Image fetch timeout: The image URL took too long to respond");
      const mockEvaluateImage = vi.fn().mockRejectedValue(mockError);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("timeout");
    });

    it("should return 400 for unsupported format errors", async () => {
      const mockError = new Error("Unsupported image format: image/gif");
      const mockEvaluateImage = vi.fn().mockRejectedValue(mockError);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.gif",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("format");
    });

    it("should return 500 for API errors", async () => {
      const mockError = new Error("OpenRouter API error: Invalid API key");
      const mockEvaluateImage = vi.fn().mockRejectedValue(mockError);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toContain("OpenRouter API error");
    });

    it("should return 500 for unexpected errors", async () => {
      const mockError = new Error("Unexpected error");
      const mockEvaluateImage = vi.fn().mockRejectedValue(mockError);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toBe("Unexpected error");
    });

    it("should return 500 for non-Error exceptions", async () => {
      const mockEvaluateImage = vi.fn().mockRejectedValue("String error");
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error).toBe("An unexpected error occurred");
    });

    it("should handle valid request with false result", async () => {
      const mockResult = {
        exists: false,
        confidence: 0.1,
        reasoning: "No golden retriever found in the image",
        status: "success" as const,
      };

      const mockEvaluateImage = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg",
          feature: "a golden retriever",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.exists).toBe(false);
      expect(body.confidence).toBe(0.1);
    });

    it("should accept URLs with query parameters", async () => {
      const mockResult = {
        exists: true,
        confidence: 0.8,
        reasoning: "Found the feature",
        status: "success" as const,
      };

      const mockEvaluateImage = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(VisionService).mockImplementation(function (this: VisionService) {
        this.evaluateImage = mockEvaluateImage;
        return this;
      });

      const response = await app.inject({
        method: "POST",
        url: "/evaluate-image",
        payload: {
          image_url: "https://example.com/image.jpg?size=large&format=jpg",
          feature: "a dog",
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
