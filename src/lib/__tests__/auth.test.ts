// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockCookieSet })),
}));

beforeEach(() => {
  mockCookieSet.mockClear();
});

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

const { createSession } = await import("@/lib/auth");

test("sets the auth-token cookie", async () => {
  await createSession("user-1", "test@example.com");
  expect(mockCookieSet).toHaveBeenCalledOnce();
  expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
});

test("cookie contains a valid JWT with userId and email", async () => {
  await createSession("user-1", "test@example.com");
  const token = mockCookieSet.mock.calls[0][1] as string;
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("test@example.com");
});

test("JWT expires in 7 days", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const token = mockCookieSet.mock.calls[0][1] as string;
  const { payload } = await jwtVerify(token, JWT_SECRET);

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expMs = payload.exp! * 1000;
  expect(expMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("cookie options include httpOnly, sameSite lax, and path /", async () => {
  await createSession("user-1", "test@example.com");
  const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("cookie secure flag is false outside production", async () => {
  await createSession("user-1", "test@example.com");
  const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
  expect(options.secure).toBe(false);
});

test("cookie secure flag is true in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetModules();

  const { createSession: fn } = await import("@/lib/auth");
  await fn("user-1", "test@example.com");

  const options = mockCookieSet.mock.calls[0][2] as Record<string, unknown>;
  expect(options.secure).toBe(true);

  vi.unstubAllEnvs();
  vi.resetModules();
});
