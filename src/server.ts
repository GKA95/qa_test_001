// src/app.ts
import express, { NextFunction, Request, Response as ExpressResponse } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";

const VALIDATION_URL = process.env.VALIDATION_URL ?? "http://localhost:4000/validate-name"; // default to mock
const USERS_PATH = path.resolve(__dirname, "../data/users.json");

export const app = express();

/** Health */
app.get("/health", (_req: Request, res: ExpressResponse) => {
  res.json({ status: "ok" });
});

/** /api/validate-users - read all names, validate each, return structured JSON */
app.get(
  "/api/validate-users",
  async (_req: Request, res: ExpressResponse, next: NextFunction) => {
    try {
      const users = await loadUsers();
      const results: Array<{ name: string; valid: boolean; message: string }> = [];

      for (const name of users) {
        const result = await validateUser(name);
        results.push(result);
      }

      res.json({ validated: results.length, results });
    } catch (error) {
      next(error);
    }
  }
);

/** Error handler */
app.use(
  (
    error: unknown,
    _req: Request,
    res: ExpressResponse,
    _next: NextFunction
  ) => {
    if (res.headersSent) {
      return;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error while validating user names.";

    res.status(500).json({ error: message });
  }
);

/** Helpers & validation logic */

type RemoteResponse = {
  message?: string;
  name?: string;
};

async function loadUsers(): Promise<string[]> {
  const raw = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(raw) as string[];
}

/** Clean and normalize names before sending to remote validator */
export function cleanName(name: string): string {
  // Normalize accented letters to ASCII equivalents (NFD + remove diacritics)
  let cleaned = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Replace curly/smart quotes with ASCII apostrophe
  cleaned = cleaned.replace(/[‘’]/g, "'");
  // Optionally remove characters that are not letters, apostrophe or space (keep digits if you want)
  // cleaned = cleaned.replace(/[^A-Za-z' ]+/g, "");
  cleaned = cleaned.trim();
  return cleaned;
}

/** Validate single user: returns object, never exits process */
export async function validateUser(name: string): Promise<{ name: string; valid: boolean; message: string }> {
  const clean = cleanName(name);
  const url = `${VALIDATION_URL}?name=${encodeURIComponent(clean)}`;

  // Informational log if we changed the name
  if (clean !== name) {
    console.log(`Normalized "${name}" → "${clean}"`);
  }

  try {
    const response = await fetch(url);
    const message = await extractMessage(response);

    if (response.status !== 200) {
      console.error(`${name} - ${message}`);
      return { name, valid: false, message };
    }

    console.log(`${name} - ${message}`);
    return { name, valid: true, message };
  } catch (_error) {
    // Don't crash the server; return a failure result to the caller
    console.error(`${name} - Service unreachable.`);
    return { name, valid: false, message: "Service unreachable" };
  }
}

async function extractMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as RemoteResponse;
    if (typeof payload?.message === "string") {
      return payload.message;
    }
  } catch (_error) {
    // ignore parse errors
  }
  return `Received status ${response.status}`;
}

export default app;
