export class ClientApiError extends Error {
  code?: string;
  retryAfterSeconds?: number;
  constructor(message: string, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const form = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      cache: "no-store",
      headers:
        body && !form ? { "Content-Type": "application/json" } : undefined,
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
      signal: path.startsWith("/api/auth/")
        ? AbortSignal.timeout(30000)
        : undefined,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new ClientApiError(
        "The request timed out. The email may still arrive; check your inbox before requesting another link.",
        "request_timeout",
        60,
      );
    throw new ClientApiError(
      "Could not reach the server. Check your connection and try again.",
      "network_error",
    );
  }
  if (response.redirected)
    throw new ClientApiError(
      "Your session changed. Sign in again to continue.",
      "session_changed",
    );
  const data = await response.json();
  if (!response.ok)
    throw new ClientApiError(
      data.error || "Request failed.",
      data.code,
      data.retryAfterSeconds,
    );
  return data as T;
}
