import axios from "axios";

/**
 * Maximum image size in bytes (10MB)
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Fetches an image from a URL and converts it to base64 format.
 *
 * @param imageUrl - The publicly accessible URL of the image to fetch
 * @returns A promise that resolves to an object with base64 string and content type
 * @throws {Error} If the image fetch times out, fails, format is unsupported, or size exceeds limit
 *
 * @example
 * ```typescript
 * const { base64, contentType } = await fetchImageAsBase64('https://example.com/image.jpg');
 * ```
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<{
  base64: string;
  contentType: string;
}> {
  // First, check Content-Length header if available (HEAD request)
  try {
    const headResponse = await axios.head(imageUrl, {
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 405, // 405 = Method Not Allowed, proceed anyway
    });

    const contentLength = headResponse.headers["content-length"];
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (!Number.isNaN(size) && size > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image size (${Math.round(size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`
        );
      }
    }
  } catch (error) {
    // If HEAD fails with 405 (Method Not Allowed), continue with GET
    // If it fails for other reasons, we still proceed (some servers don't support HEAD)
    // But if it's our own size validation error, re-throw it
    if (error instanceof Error && error.message.includes("exceeds maximum allowed size")) {
      throw error;
    }
    // For other errors (including 405), continue with GET
    if (!axios.isAxiosError(error) || error.response?.status !== 405) {
      // Ignore other errors and proceed with GET
    }
  }

  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 10_000,
    validateStatus: (status) => status === 200,
    maxContentLength: MAX_IMAGE_SIZE,
    maxBodyLength: MAX_IMAGE_SIZE,
  });

  // Check actual downloaded size
  if (response.data.byteLength > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image size (${Math.round(response.data.byteLength / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`
    );
  }

  const contentType = (response.headers["content-type"] || "").toLowerCase().split(";")[0].trim();
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  // If content-type is missing or not recognized, we'll default to image/jpeg later
  // But if it's explicitly set and not in allowed types, throw error
  if (contentType && !allowedTypes.some((type) => contentType.includes(type))) {
    throw new Error(`Unsupported image format: ${contentType}. Supported formats: JPG, PNG, WebP`);
  }

  let base64: string;
  try {
    base64 = Buffer.from(response.data).toString("base64");
  } catch (error) {
    throw new Error(
      `Failed to convert image to base64: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  // Normalize content type
  const normalizedContentType = contentType.includes("png")
    ? "image/png"
    : contentType.includes("webp")
      ? "image/webp"
      : "image/jpeg";

  return {
    base64,
    contentType: normalizedContentType,
  };
}
