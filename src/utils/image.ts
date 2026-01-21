import axios from 'axios';

/**
 * Fetches an image from a URL and converts it to base64 format.
 * 
 * @param imageUrl - The publicly accessible URL of the image to fetch
 * @returns A promise that resolves to the base64-encoded image string
 * @throws {Error} If the image fetch times out, fails, or the format is unsupported
 * 
 * @example
 * ```typescript
 * const base64 = await fetchImageAsBase64('https://example.com/image.jpg');
 * ```
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 10000,
    validateStatus: (status) => status === 200,
  });

  const contentType = response.headers['content-type'] || 'image/jpeg';
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.some(type => contentType.includes(type))) {
    throw new Error(`Unsupported image format: ${contentType}. Supported formats: JPG, PNG, WebP`);
  }

  return Buffer.from(response.data).toString('base64');
}

/**
 * Determines the MIME content type of an image based on its URL extension.
 * 
 * @param imageUrl - The URL of the image
 * @returns The MIME type string ('image/png', 'image/webp', or 'image/jpeg')
 * 
 * @example
 * ```typescript
 * const contentType = getContentType('https://example.com/image.png');
 * // Returns: 'image/png'
 * ```
 */
export function getContentType(imageUrl: string): string {
  if (imageUrl.toLowerCase().includes('.png')) {
    return 'image/png';
  } else if (imageUrl.toLowerCase().includes('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}
