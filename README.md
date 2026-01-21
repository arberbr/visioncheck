# VisionCheck PoC

A Proof of Concept backend service that uses AI vision capabilities to determine if specific visual features are present in images. Built with Fastify, TypeScript, and OpenRouter API.

## Overview

VisionCheck PoC provides a simple, stateless REST API endpoint that accepts an image URL and a text-based feature description, returning a boolean evaluation, confidence score, and reasoning using AI vision models via OpenRouter API. The service supports any vision-capable model available on OpenRouter, including free models like MoLMo-2-8B from AllenAI.

## Features

- ✅ **Single POST endpoint**: `/evaluate-image` for image feature detection
- ✅ **Health check endpoint**: `/health` for service monitoring
- ✅ **Image format support**: JPG, PNG, WebP (max 10MB)
- ✅ **Natural language queries**: Accepts descriptive feature descriptions (1-500 characters)
- ✅ **Structured responses**: Returns boolean result, confidence score (0-1), and reasoning
- ✅ **Fastify framework**: High-performance HTTP server
- ✅ **TypeScript**: Full type safety with strict mode
- ✅ **Zod validation**: Request/response schema validation
- ✅ **Comprehensive error handling**: Detailed error messages for different failure scenarios
- ✅ **CORS enabled**: Cross-origin requests supported with configurable origins
- ✅ **Rate limiting**: Built-in rate limiting to prevent abuse
- ✅ **SSRF protection**: Basic protection against Server-Side Request Forgery attacks
- ✅ **OpenRouter integration**: Access to multiple vision models through unified API
- ✅ **Comprehensive testing**: Unit tests with Vitest and code coverage
- ✅ **Code quality**: Linting and formatting with Biome

## Prerequisites

- **Node.js** 18+ and npm
- **OpenRouter API key** (get one at [openrouter.ai](https://openrouter.ai))

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Required: OpenRouter API key
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Server configuration
PORT=3000
HOST=127.0.0.1
NODE_ENV=development

# Optional: CORS configuration (comma-separated origins, or omit to allow all)
CORS_ORIGIN=https://example.com,https://app.example.com

# Optional: Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute

# Optional: OpenRouter model override
OPENROUTER_MODEL=allenai/molmo-2-8b:free

# Optional: Domain whitelist for image URLs (comma-separated)
ALLOWED_IMAGE_DOMAINS=example.com,cdn.example.com
```

See [Environment Variables](#environment-variables) section for complete documentation.

### 3. Run in Development Mode

```bash
npm run dev
```

The server will start on `http://127.0.0.1:3000` (or your configured HOST:PORT).

### 4. Build for Production

```bash
npm run build
npm start
```

## API Documentation

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "service": "visioncheck-poc",
  "time": "2024-01-01T12:00:00.000Z"
}
```

### Evaluate Image

**Endpoint:** `POST /evaluate-image`

**Request Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "feature": "a golden retriever"
}
```

**Request Validation:**
- `image_url`: Must be a valid HTTP/HTTPS URL
- `feature`: String between 1-500 characters

**Success Response (200):**
```json
{
  "exists": true,
  "confidence": 0.95,
  "reasoning": "The image clearly shows a golden retriever dog with characteristic golden fur, floppy ears, and friendly expression.",
  "status": "success"
}
```

**Error Response (400):**
```json
{
  "error": "image_url must be a valid HTTP/HTTPS URL",
  "status": "error"
}
```

**Error Response (500):**
```json
{
  "error": "OpenRouter API error: Invalid API key",
  "status": "error"
}
```

## Usage Examples

### cURL

```bash
curl -X POST http://localhost:3000/evaluate-image \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/dog.jpg",
    "feature": "a golden retriever"
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/evaluate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_url: 'https://example.com/image.jpg',
    feature: 'a sunset over the ocean'
  })
});

const result = await response.json();
console.log(result);
```

### Python

```python
import requests

url = "http://localhost:3000/evaluate-image"
payload = {
    "image_url": "https://example.com/image.jpg",
    "feature": "a person wearing sunglasses"
}

response = requests.post(url, json=payload)
print(response.json())
```

## Project Structure

```
visioncheck/
├── src/
│   ├── index.ts                 # Server entry point and configuration
│   ├── routes/
│   │   ├── evaluate-image.ts    # Image evaluation endpoint
│   │   ├── health.ts            # Health check endpoint
│   │   └── __tests__/           # Route tests
│   ├── services/
│   │   ├── vision-service.ts    # OpenRouter API integration
│   │   └── __tests__/           # Service tests
│   ├── utils/
│   │   ├── image.ts             # Image helpers (fetch base64, content type)
│   │   ├── url-validator.ts    # URL validation and SSRF protection
│   │   └── __tests__/           # Utility tests
│   ├── schemas/
│   │   ├── validation.ts        # Zod validation schemas
│   │   └── __tests__/           # Schema tests
│   └── __tests__/               # Integration tests
├── dist/                        # Compiled JavaScript (generated)
├── coverage/                    # Test coverage reports (generated)
├── package.json
├── tsconfig.json
├── vitest.config.ts             # Vitest test configuration
├── biome.json                   # Biome linter/formatter configuration
└── README.md
```

## Technical Details

### Architecture

1. **Request Validation**: Validates image URL format and feature description using Zod schemas
2. **Image Fetching**: Downloads image from provided URL with 10-second timeout
3. **Image Processing**: Converts image to base64 and validates format (JPG, PNG, WebP)
4. **AI Analysis**: Sends image and feature description to OpenRouter API with a default free vision model
5. **Response Parsing**: Extracts JSON from AI response, validates structure, and normalizes confidence scores
6. **Error Handling**: Comprehensive error handling for invalid URLs, timeouts, API errors, and parsing failures

### Default Configuration

- **Model**: `allenai/molmo-2-8b:free` (free vision model from AllenAI)
- **Temperature**: 0.3 (lower for more consistent results)
- **Max Tokens**: 500
- **Image Fetch Timeout**: 10 seconds
- **API Request Timeout**: 30 seconds
- **Confidence Range**: Normalized to 0.0 - 1.0

### Supported Image Formats

- JPEG/JPG
- PNG
- WebP

### Error Handling

The service handles various error scenarios:

- **400 Bad Request**: Invalid image URL, unsupported image format, validation errors, SSRF protection violations, domain whitelist violations
- **500 Internal Server Error**: Missing API key, OpenRouter API errors, image fetch failures, parsing errors, server configuration errors

### Security Features

- **SSRF Protection**: Blocks private IP ranges, localhost, and metadata endpoints
- **Domain Whitelist**: Optional domain whitelist for image URLs
- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation using Zod schemas
- **URL Validation**: Strict URL format validation (HTTP/HTTPS only)
- **Image Size Limits**: Maximum 10MB image size limit
- **Request Timeouts**: Timeouts for image fetching (10s) and API requests (30s)

## Development

### Available Scripts

**Development:**
- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled JavaScript
- `npm run type-check` - Type check without emitting files

**Testing:**
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:coverage` - Run tests with coverage report

**Code Quality:**
- `npm run lint` - Lint code with Biome
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Biome
- `npm run format:fix` - Format and auto-fix issues
- `npm run check` - Run both lint and format checks
- `npm run check:fix` - Run both lint and format with auto-fix

### Development Workflow

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Check code quality:**
   ```bash
   npm run check
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

### Type Checking

```bash
npm run type-check
```

### Testing

The project uses [Vitest](https://vitest.dev/) for testing. Tests are located alongside source files in `__tests__` directories.

**Run all tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

**Run tests in UI mode:**
```bash
npm run test:ui
```

Test coverage reports are generated in the `coverage/` directory.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | OpenRouter API key for authentication. Get one at [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_MODEL` | No | `allenai/molmo-2-8b:free` | OpenRouter model identifier. Must be a vision-capable model |
| `PORT` | No | `3000` | Server port (1-65535) |
| `HOST` | No | `127.0.0.1` | Server host address |
| `NODE_ENV` | No | `development` | Environment mode. `production` enables production logging, `test` disables server startup |
| `CORS_ORIGIN` | No | `true` (allow all) | Comma-separated list of allowed CORS origins. If not set, all origins are allowed |
| `RATE_LIMIT_MAX` | No | `100` | Maximum number of requests per time window |
| `RATE_LIMIT_WINDOW` | No | `1 minute` | Time window for rate limiting (e.g., "1 minute", "1 hour") |
| `ALLOWED_IMAGE_DOMAINS` | No | - | Comma-separated list of allowed domains for image URLs. If set, only images from these domains are allowed |
| `VITEST` | No | - | Set automatically by Vitest. Used to detect test environment |

**Notes:**
- Only `OPENROUTER_API_KEY` is required
- Invalid `PORT` values will cause the server to fail on startup
- `ALLOWED_IMAGE_DOMAINS` enables domain whitelisting for additional security
- Rate limiting applies globally to all endpoints
- CORS configuration is permissive by default; restrict in production

## Technical Stack

- **Runtime**: Node.js 18+ with TypeScript 5.4+
- **Framework**: Fastify 4.x
- **Validation**: Zod 3.x
- **AI Provider**: OpenRouter API
  - Default model: MoLMo-2-8B (free vision model from AllenAI)
  - Supports any vision-capable model on OpenRouter
- **HTTP Client**: Axios
- **Logging**: Pino (with pino-pretty for development)
- **Testing**: Vitest with coverage support
- **Code Quality**: Biome (linting and formatting)
- **Path aliases**: `@/*` mapped to `src/*` (rewritten in build via `tsc-alias`)

## Security Considerations

### Current Security Features

✅ **SSRF Protection**: Basic protection against Server-Side Request Forgery
- Blocks private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Blocks localhost and loopback addresses
- Blocks metadata endpoints (169.254.169.254, metadata.google.internal)
- Validates URL protocol (HTTP/HTTPS only)

✅ **Input Validation**: Comprehensive validation using Zod
- URL format validation
- Feature description length limits (1-500 characters)
- Image size limits (10MB maximum)

✅ **Rate Limiting**: Configurable rate limiting to prevent abuse

✅ **Domain Whitelist**: Optional domain whitelist for image URLs

### Known Limitations & Recommendations

⚠️ **SSRF Protection Limitations:**
- Current implementation validates hostname strings but doesn't resolve DNS to check actual IP addresses
- DNS rebinding attacks could potentially bypass hostname-based checks
- IPv6 private ranges not fully covered
- **Recommendation**: For production use, consider implementing DNS resolution validation or using a library like `ssrf-filter`

⚠️ **IP Address Validation:**
- String-based IP validation may miss edge cases (e.g., `010.0.0.1` format)
- **Recommendation**: Use proper IP parsing libraries for production

⚠️ **URL Length:**
- No maximum URL length validation
- **Recommendation**: Add URL length limits (e.g., 2048 characters) to prevent DoS

⚠️ **DNS Timeout:**
- No explicit DNS resolution timeout configured
- **Recommendation**: Configure DNS timeout in axios or use a DNS library with timeout support

⚠️ **Caching:**
- No caching mechanism for repeated image requests
- **Recommendation**: Consider implementing image URL caching with TTL for performance

⚠️ **Memory Usage:**
- Large images are fully loaded into memory during processing
- **Recommendation**: For production with high traffic, consider streaming or size-based processing limits

### Production Deployment Recommendations

1. **Environment Variables**: Use secure secret management (e.g., AWS Secrets Manager, HashiCorp Vault)
2. **CORS**: Restrict `CORS_ORIGIN` to specific domains in production
3. **Rate Limiting**: Adjust `RATE_LIMIT_MAX` based on expected traffic
4. **Domain Whitelist**: Enable `ALLOWED_IMAGE_DOMAINS` for additional security
5. **Monitoring**: Add application monitoring (e.g., Sentry, DataDog)
6. **Logging**: Configure structured logging for production environments
7. **HTTPS**: Always use HTTPS in production
8. **Reverse Proxy**: Use a reverse proxy (nginx, Cloudflare) for additional security layers

## Known Issues

The following issues have been identified during code analysis:

1. **SSRF Protection Gaps**: Hostname-based validation doesn't resolve DNS (see Security Considerations)
2. **IP Address Validation**: String-based checks may miss edge cases
3. **Missing URL Length Validation**: No maximum URL length limit
4. **DNS Timeout**: No explicit DNS resolution timeout
5. **Console Usage**: `console.error` used in `src/index.ts:108` instead of logger (minor)

These are documented for awareness. The service is functional for development and testing, but production deployments should address these security considerations.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run check`
6. Submit a pull request

## License

MIT License - see LICENSE file for details