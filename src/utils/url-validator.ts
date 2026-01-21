/**
 * Validates if a URL is allowed based on domain whitelist and SSRF protection.
 *
 * @param url - The URL to validate
 * @param allowedDomains - Optional comma-separated list of allowed domains (e.g., "example.com,api.example.com")
 * @returns An object with isValid boolean and optional error message
 */
export function validateImageUrl(
  url: string,
  allowedDomains?: string
): { isValid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    // Must be HTTP or HTTPS
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: "image_url must use HTTP or HTTPS protocol",
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // If allowedDomains is provided, check whitelist
    if (allowedDomains && allowedDomains.trim() !== "") {
      const domains = allowedDomains
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d.length > 0);

      if (domains.length > 0) {
        const isAllowed = domains.some((domain) => {
          // Exact match or subdomain match
          return hostname === domain || hostname.endsWith(`.${domain}`);
        });

        if (!isAllowed) {
          return {
            isValid: false,
            error: "image_url domain is not in the allowed list",
          };
        }
      }
    }

    // SSRF Protection: Block private IP ranges and localhost
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.20.") ||
      hostname.startsWith("172.21.") ||
      hostname.startsWith("172.22.") ||
      hostname.startsWith("172.23.") ||
      hostname.startsWith("172.24.") ||
      hostname.startsWith("172.25.") ||
      hostname.startsWith("172.26.") ||
      hostname.startsWith("172.27.") ||
      hostname.startsWith("172.28.") ||
      hostname.startsWith("172.29.") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("[::1]") ||
      hostname.startsWith("[fe80:")
    ) {
      return {
        isValid: false,
        error: "image_url cannot point to private or localhost addresses",
      };
    }

    // Block metadata endpoints
    if (hostname === "169.254.169.254" || hostname.includes("metadata.google.internal")) {
      return {
        isValid: false,
        error: "image_url cannot point to metadata endpoints",
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "image_url must be a valid URL",
    };
  }
}
