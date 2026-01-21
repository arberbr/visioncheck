# VisionCheck PoC

A Proof of Concept backend service that uses AI vision capabilities to determine if specific visual features are present in images. Built with Fastify, TypeScript, and OpenRouter API.

## Overview

VisionCheck PoC provides a simple, stateless REST API endpoint that accepts an image URL and a text-based feature description, returning a boolean evaluation, confidence score, and reasoning using AI vision models via OpenRouter API. The service supports any vision-capable model available on OpenRouter, including free models like MoLMo-2-8B from AllenAI.

## Features

- ✅ **Single POST endpoint**: `/evaluate-image` for image feature detection
- ✅ **Health check endpoint**: `/health` for service monitoring
- ✅ **Image format support**: JPG, PNG, WebP
- ✅ **Natural language queries**: Accepts descriptive feature descriptions (1-500 characters)
- ✅ **Structured responses**: Returns boolean result, confidence score (0-1), and reasoning
- ✅ **Fastify framework**: High-performance HTTP server
- ✅ **TypeScript**: Full type safety with strict mode
- ✅ **Zod validation**: Request/response schema validation
- ✅ **Comprehensive error handling**: Detailed error messages for different failure scenarios
- ✅ **CORS enabled**: Cross-origin requests supported
- ✅ **OpenRouter integration**: Access to multiple vision models through unified API

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
```

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
│   │   └── health.ts            # Health check endpoint
│   ├── services/
│   │   └── vision-service.ts   # OpenRouter API integration
│   └── schemas/
│       └── validation.ts        # Zod validation schemas
├── dist/                        # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Technical Details

### Architecture

1. **Request Validation**: Validates image URL format and feature description using Zod schemas
2. **Image Fetching**: Downloads image from provided URL with 10-second timeout
3. **Image Processing**: Converts image to base64 and validates format (JPG, PNG, WebP)
4. **AI Analysis**: Sends image and feature description to OpenRouter API with selected vision model
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

- **400 Bad Request**: Invalid image URL, unsupported image format, validation errors
- **500 Internal Server Error**: Missing API key, OpenRouter API errors, image fetch failures, parsing errors

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled JavaScript
- `npm run type-check` - Type check without emitting files

### Type Checking

```bash
npm run type-check
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | OpenRouter API key for authentication |
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `127.0.0.1` | Server host |
| `NODE_ENV` | No | `development` | Environment mode (affects logging) |

## Technical Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify 4.x
- **Validation**: Zod 3.x
- **AI Provider**: OpenRouter API
  - Default model: MoLMo-2-8B (free vision model from AllenAI)
  - Supports any vision-capable model on OpenRouter
- **HTTP Client**: Axios
- **Logging**: Pino (with pino-pretty for development)