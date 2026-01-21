import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchImageAsBase64 } from "../image";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// Create typed mock functions
const mockGet = vi.fn();
const mockHead = vi.fn();

describe("Image Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock HEAD requests to return 200 by default
    mockHead.mockResolvedValue({ headers: {}, status: 200 });
    // Assign mocks to axios
    (mockedAxios.get as ReturnType<typeof vi.fn>) = mockGet;
    (mockedAxios.head as ReturnType<typeof vi.fn>) = mockHead;
  });

  describe("fetchImageAsBase64", () => {
    it("should fetch an image and convert it to base64", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      mockGet.mockResolvedValue({
        data: mockImageBuffer,
        headers: { "content-type": "image/jpeg" },
        status: 200,
      });

      const result = await fetchImageAsBase64("https://example.com/image.jpg");

      expect(mockHead).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith("https://example.com/image.jpg", {
        responseType: "arraybuffer",
        timeout: 10_000,
        validateStatus: expect.any(Function),
        maxContentLength: 10 * 1024 * 1024,
        maxBodyLength: 10 * 1024 * 1024,
      });
      expect(result.base64).toBe(mockImageBuffer.toString("base64"));
      expect(result.contentType).toBe("image/jpeg");
    });

    it("should handle PNG images", async () => {
      const mockImageBuffer = Buffer.from("fake-png-data");
      mockGet.mockResolvedValue({
        data: mockImageBuffer,
        headers: { "content-type": "image/png" },
        status: 200,
      });

      const result = await fetchImageAsBase64("https://example.com/image.png");
      expect(result.base64).toBe(mockImageBuffer.toString("base64"));
      expect(result.contentType).toBe("image/png");
    });

    it("should handle WebP images", async () => {
      const mockImageBuffer = Buffer.from("fake-webp-data");
      mockGet.mockResolvedValue({
        data: mockImageBuffer,
        headers: { "content-type": "image/webp" },
        status: 200,
      });

      const result = await fetchImageAsBase64("https://example.com/image.webp");
      expect(result.base64).toBe(mockImageBuffer.toString("base64"));
      expect(result.contentType).toBe("image/webp");
    });

    it("should default to image/jpeg when content-type is missing", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      mockGet.mockResolvedValue({
        data: mockImageBuffer,
        headers: {},
        status: 200,
      });

      const result = await fetchImageAsBase64("https://example.com/image.jpg");
      expect(result.base64).toBe(mockImageBuffer.toString("base64"));
      expect(result.contentType).toBe("image/jpeg");
    });

    it("should throw error for unsupported image format", async () => {
      mockGet.mockResolvedValue({
        data: Buffer.from("fake-gif-data"),
        headers: { "content-type": "image/gif" },
        status: 200,
      });

      await expect(fetchImageAsBase64("https://example.com/image.gif")).rejects.toThrow(
        "Unsupported image format"
      );
    });

    it("should throw error on timeout", async () => {
      const timeoutError = new Error("timeout");
      (timeoutError as { code?: string }).code = "ECONNABORTED";
      mockGet.mockRejectedValue(timeoutError);

      await expect(fetchImageAsBase64("https://example.com/image.jpg")).rejects.toThrow();
    });

    it("should throw error on HTTP error status", async () => {
      const httpError = new Error("Request failed");
      (httpError as { response?: { status: number } }).response = { status: 404 };
      Object.defineProperty(httpError, "isAxiosError", { value: true });
      mockGet.mockRejectedValue(httpError);

      // The validateStatus function should reject non-200 status
      await expect(fetchImageAsBase64("https://example.com/image.jpg")).rejects.toThrow();
    });

    it("should handle case-insensitive content-type matching", async () => {
      const mockImageBuffer = Buffer.from("fake-image-data");
      mockGet.mockResolvedValue({
        data: mockImageBuffer,
        headers: { "content-type": "IMAGE/JPEG" },
        status: 200,
      });

      const result = await fetchImageAsBase64("https://example.com/image.jpg");
      expect(result.base64).toBe(mockImageBuffer.toString("base64"));
      expect(result.contentType).toBe("image/jpeg");
    });

    it("should reject images larger than 10MB", async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      mockHead.mockResolvedValueOnce({
        headers: { "content-length": String(largeBuffer.length) },
        status: 200,
      });

      await expect(fetchImageAsBase64("https://example.com/large-image.jpg")).rejects.toThrow(
        "exceeds maximum allowed size"
      );
    });
  });
});
