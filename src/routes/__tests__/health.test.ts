import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { healthRoute } from "@/routes/health";

describe("Health Route", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(healthRoute);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should return health check response", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("service", "visioncheck-poc");
    expect(body).toHaveProperty("time");
    expect(typeof body.time).toBe("string");
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });

  it("should return valid ISO timestamp", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    const body = JSON.parse(response.body);
    const timestamp = new Date(body.time);
    expect(timestamp.getTime()).toBeGreaterThan(0);
    expect(Number.isNaN(timestamp.getTime())).toBe(false);
  });

  it("should have correct response schema", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("visioncheck-poc");
    expect(typeof body.time).toBe("string");
  });
});
