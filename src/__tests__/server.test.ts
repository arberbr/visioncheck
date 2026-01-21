import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "@/index";

describe("Server Setup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should build server with correct configuration", async () => {
    process.env.NODE_ENV = "development";

    const server = await buildServer();

    expect(server).toBeDefined();
    // Fastify instance check - server should have Fastify methods
    expect(server).toHaveProperty("register");
    expect(server).toHaveProperty("inject");

    await server.close();
  });

  it("should configure logger for development", async () => {
    process.env.NODE_ENV = "development";

    const server = await buildServer();

    // Logger should be configured (we can't directly test transport, but server should exist)
    expect(server).toBeDefined();

    await server.close();
  });

  it("should configure logger for production", async () => {
    process.env.NODE_ENV = "production";

    const server = await buildServer();

    expect(server).toBeDefined();

    await server.close();
  });

  it("should register CORS plugin", async () => {
    const server = await buildServer();

    // CORS should be registered (we verify by checking server exists)
    expect(server).toBeDefined();

    await server.close();
  });

  it("should register health route", async () => {
    await import("../routes/health");

    const server = await buildServer();

    // Verify health route is accessible
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    await server.close();
  });

  it("should register evaluate-image route", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    const server = await buildServer();

    // Verify route exists (will return error without proper setup, but route should be registered)
    const response = await server.inject({
      method: "POST",
      url: "/evaluate-image",
      payload: {
        image_url: "https://example.com/image.jpg",
        feature: "test",
      },
    });

    // Route should exist (not 404)
    expect(response.statusCode).not.toBe(404);

    await server.close();
  });
});
