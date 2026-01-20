# VisionCheck PoC

A Proof of Concept backend service that uses AI vision capabilities to determine if specific visual features are present in images.

## Overview

VisionCheck PoC provides a simple, stateless API endpoint that accepts an image URL and a text-based feature description, returning a boolean evaluation and confidence score using Anthropic's Claude 3.5 Haiku vision model.

## Features

- ✅ Single POST endpoint: `/evaluate-image`
- ✅ Accepts publicly accessible image URLs (JPG, PNG, WebP)
- ✅ Natural language feature descriptions
- ✅ Returns boolean result, confidence score, and reasoning
- ✅ Fastify framework for high performance
- ✅ TypeScript with full type safety
- ✅ Zod schema validation
- ✅ Comprehensive error handling

## Prerequisites

- Node.js 18+ and npm
- Anthropic API key (Claude 3.5 Haiku access required)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PORT=3000
   HOST=0.0.0.0
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Usage

### Endpoint: `POST /evaluate-image`

**Request Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "feature": "a golden retriever"
}
```

**Success Response (200):**
```json
{
  "exists": true,
  "confidence": 0.95,
  "reasoning": "The image clearly shows a golden retriever dog with characteristic golden fur, floppy ears, and friendly expression.",
  "status": "success"
}
```

**Error Response (400/500):**
```json
{
  "error": "Error message describing what went wrong",
  "status": "error"
}
```

### Example cURL Request

```bash
curl -X POST http://localhost:3000/evaluate-image \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/dog.jpg",
    "feature": "a golden retriever"
  }'
```

### Example with JavaScript/TypeScript

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

## Health Check

```bash
GET /health
```

Returns: `{ "status": "ok", "service": "visioncheck-poc" }`

## Technical Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Fastify
- **Validation:** Zod
- **AI Provider:** Anthropic Claude 3.5 Haiku
- **HTTP Client:** Axios

## Architecture

1. **Request Validation:** Validates image URL format and feature description using Zod
2. **Image Fetching:** Downloads image from provided URL and converts to base64
3. **AI Analysis:** Sends image and feature description to Claude 3.5 Haiku Vision API
4. **Response Parsing:** Extracts JSON from AI response and normalizes confidence scores
5. **Error Handling:** Comprehensive error handling for invalid URLs, timeouts, API errors, etc.

## Limitations (PoC)

- Single endpoint only
- No authentication/authorization
- No rate limiting
- No caching
- No image storage/processing optimization
- Designed for evaluation purposes only

## License

MIT
