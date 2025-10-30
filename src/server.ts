
import express, { NextFunction, Request, Response as ExpressResponse } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";

const VALIDATION_URL = process.env.VALIDATION_URL ?? "http://localhost:4000/validate-name"; // default to mock
const USERS_PATH = path.resolve(__dirname, "../data/users.json");

const app = express();

/** Health endpoint */
app.get("/health", (_req: Request, res: ExpressResponse) => {
  res.json({ status: "ok" });
});

/** /api/validate-users endpoint */
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
app.use((error: unknown, _req: Request, res: ExpressResponse, _next: NextFunction) => {
  if (res.headersSent) return;
  const message = error instanceof Error ? error.message : "Unexpected error while validating user names.";
  res.status(500).json({ error: message });
});

/** Helpers & validation logic */
type RemoteResponse = { message?: string; name?: string };

async function loadUsers(): Promise<string[]> {
  const raw = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(raw) as string[];
}

/** Clean and normalize names */
function cleanName(name: string): string {
  let cleaned = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  cleaned = cleaned.replace(/[‘’]/g, "'");
  return cleaned.trim();
}

/** Validate single user */
async function validateUser(name: string): Promise<{ name: string; valid: boolean; message: string }> {
  const clean = cleanName(name);
  const url = `${VALIDATION_URL}?name=${encodeURIComponent(clean)}`;

  if (clean !== name) console.log(`Normalized "${name}" → "${clean}"`);

  try {
    const response = await fetch(url);
    const payload = (await response.json()) as RemoteResponse;
    const message = payload?.message || `Received status ${response.status}`;
    return { name, valid: response.status === 200, message };
  } catch (_error) {
    console.error(`${name} - Service unreachable.`);
    return { name, valid: false, message: "Service unreachable" };
  }
}

/** Start server */
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
