/** Message from anything that can be thrown, or `fallback` when there is none. */
export function errorMessage(error: unknown, fallback = ""): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/** The string `code` that Firebase and other SDKs attach to errors, or "" when absent. */
export function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code?: unknown };
    return typeof code === "string" ? code : "";
  }
  return "";
}
