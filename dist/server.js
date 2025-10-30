// tests/server.test.ts
import request from "supertest";
import app, { cleanName, validateUser } from "../src/app";

declare const global: any;

// Mock fetch globally for controlled responses during tests
beforeAll(() => {
  global.fetch = jest.fn(async (url: string) => {
    const parsed = new URL(url);
    const nm = parsed.searchParams.get("name") ?? "";

    // Accept only ASCII letters, space, apostrophe
    if (/^[A-Za-z' ]+$/.test(nm)) {
      return {
        status: 200,
        json: async () => ({ message: "Name is valid." }),
      } as Response;
    }

    return {
      status: 400,
      json: async () => ({ message: "Name is invalid. Only characters allowed in a name is permitted" }),
    } as Response;
  });
});

describe("QA Incident Simulation", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  it("cleanName normalizes accents and smart quotes", () => {
    expect(cleanName("María López")).toBe("Maria Lopez");
    expect(cleanName("Luc O‘Connor")).toBe("Luc O'Connor");
    expect(cleanName("  Sara O’Malley ")).toBe("Sara O'Malley");
  });

  it("validateUser returns valid true for cleaned names", async () => {
    const res = await validateUser("María López"); // uses mocked fetch
    expect(res.valid).toBe(true);
    expect(res.message).toBe("Name is valid.");
  });

  it("GET /api/validate-users returns structured result", async () => {
    const res = await request(app).get("/api/validate-users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("validated");
    expect(Array.isArray(res.body.results)).toBe(true);

    res.body.results.forEach((r: any) => {
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("valid");
      expect(r).toHaveProperty("message");
    });
  });
});

