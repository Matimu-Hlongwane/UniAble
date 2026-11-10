import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

/** Extracts a printable message from anything that can be thrown. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/** Reads the string `code` property that Firebase and other SDKs attach to errors. */
export function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code?: unknown };
    return typeof code === "string" ? code : "";
  }
  return "";
}

export const nowIso = (): string => new Date().toISOString();

/** Coerces any value to a string, using `fallback` for null/undefined. */
export const str = (value: unknown, fallback = ""): string =>
  value === undefined || value === null ? fallback : String(value);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Request body as a loosely typed record; individual fields are validated by each route. */
export function bodyOf(req: Request): Record<string, unknown> {
  return isRecord(req.body) ? req.body : {};
}

/**
 * Returns the verified Firebase token. Only call this in handlers that run
 * behind requireFirebaseUser, which guarantees the token is present.
 */
export function authToken(req: Request): DecodedIdToken {
  if (!req.firebaseToken) {
    throw new Error("Route used authToken() without requireFirebaseUser.");
  }
  return req.firebaseToken;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async handler so its return value is ignored and rejections reach next(). */
export const route =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
