import { describe, expect, it } from "vitest";
import {
  EvaluateImageRequestSchema,
  type EvaluateImageResponse,
  EvaluateImageResponseSchema,
} from "@/schemas/validation";

describe("Validation Schemas", () => {
  describe("EvaluateImageRequestSchema", () => {
    it("should validate a valid request", () => {
      const validRequest = {
        image_url: "https://example.com/image.jpg",
        feature: "a golden retriever",
      };

      const result = EvaluateImageRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it("should validate HTTP URLs", () => {
      const request = {
        image_url: "http://example.com/image.jpg",
        feature: "a dog",
      };

      const result = EvaluateImageRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should validate HTTPS URLs", () => {
      const request = {
        image_url: "https://example.com/image.jpg",
        feature: "a dog",
      };

      const result = EvaluateImageRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URLs", () => {
      const invalidRequest = {
        image_url: "not-a-url",
        feature: "a dog",
      };

      const result = EvaluateImageRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("valid URL");
      }
    });

    it("should reject non-HTTP/HTTPS URLs", () => {
      const invalidRequest = {
        image_url: "ftp://example.com/image.jpg",
        feature: "a dog",
      };

      const result = EvaluateImageRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("HTTP/HTTPS");
      }
    });

    it("should reject empty feature", () => {
      const invalidRequest = {
        image_url: "https://example.com/image.jpg",
        feature: "",
      };

      const result = EvaluateImageRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("cannot be empty");
      }
    });

    it("should reject feature longer than 500 characters", () => {
      const invalidRequest = {
        image_url: "https://example.com/image.jpg",
        feature: "a".repeat(501),
      };

      const result = EvaluateImageRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("too long");
      }
    });

    it("should accept feature with exactly 500 characters", () => {
      const validRequest = {
        image_url: "https://example.com/image.jpg",
        feature: "a".repeat(500),
      };

      const result = EvaluateImageRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should reject missing image_url", () => {
      const invalidRequest = {
        feature: "a dog",
      } as unknown;

      const result = EvaluateImageRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should reject missing feature", () => {
      const invalidRequest = {
        image_url: "https://example.com/image.jpg",
      } as unknown;

      const result = EvaluateImageRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it("should handle URLs with query parameters", () => {
      const validRequest = {
        image_url: "https://example.com/image.jpg?size=large&format=jpg",
        feature: "a dog",
      };

      const result = EvaluateImageRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it("should handle URLs with ports", () => {
      const validRequest = {
        image_url: "https://example.com:8080/image.jpg",
        feature: "a dog",
      };

      const result = EvaluateImageRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe("EvaluateImageResponseSchema", () => {
    it("should validate a valid success response", () => {
      const validResponse: EvaluateImageResponse = {
        exists: true,
        confidence: 0.95,
        reasoning: "The image clearly shows a golden retriever",
        status: "success",
      };

      const result = EvaluateImageResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("should validate a valid error response", () => {
      const validResponse: EvaluateImageResponse = {
        exists: false,
        confidence: 0.0,
        reasoning: "Error occurred",
        status: "error",
      };

      const result = EvaluateImageResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("should reject confidence less than 0", () => {
      const invalidResponse = {
        exists: true,
        confidence: -0.1,
        reasoning: "test",
        status: "success",
      };

      const result = EvaluateImageResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("should reject confidence greater than 1", () => {
      const invalidResponse = {
        exists: true,
        confidence: 1.1,
        reasoning: "test",
        status: "success",
      };

      const result = EvaluateImageResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("should accept confidence at boundaries", () => {
      const response1 = {
        exists: true,
        confidence: 0,
        reasoning: "test",
        status: "success",
      };

      const response2 = {
        exists: true,
        confidence: 1,
        reasoning: "test",
        status: "success",
      };

      expect(EvaluateImageResponseSchema.safeParse(response1).success).toBe(true);
      expect(EvaluateImageResponseSchema.safeParse(response2).success).toBe(true);
    });

    it("should reject invalid status", () => {
      const invalidResponse = {
        exists: true,
        confidence: 0.5,
        reasoning: "test",
        status: "invalid",
      } as unknown;

      const result = EvaluateImageResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("should reject non-boolean exists", () => {
      const invalidResponse = {
        exists: "true",
        confidence: 0.5,
        reasoning: "test",
        status: "success",
      } as unknown;

      const result = EvaluateImageResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("should reject non-string reasoning", () => {
      const invalidResponse = {
        exists: true,
        confidence: 0.5,
        reasoning: 123,
        status: "success",
      } as unknown;

      const result = EvaluateImageResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
});
