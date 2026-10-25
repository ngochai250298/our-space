"use client";

/**
 * Thin fetch wrapper for the app's own /api routes.
 *
 * Everything the browser used to do against Supabase now goes through these
 * helpers: the anon key is gone from the client, and the Worker talks to D1
 * and R2 on the server side instead.
 *
 * A non-2xx answer throws with the body text, so callers can match on the
 * message ("duplicate", ...) the route returned.
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers:
      !init?.body || init.body instanceof FormData
        ? init?.headers
        : { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  // 204 No Content (DELETE) has no body to parse.
  if (res.status !== 204) return (await res.json()) as T;
  return undefined as T;
}

type Body = FormData | Record<string, unknown> | undefined;

function send<T>(url: string, method: string, body?: Body): Promise<T> {
  return request<T>(url, {
    method,
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function apiPost<T>(url: string, body?: Body): Promise<T> {
  return send<T>(url, "POST", body);
}

export function apiPatch<T>(url: string, body?: Body): Promise<T> {
  return send<T>(url, "PATCH", body);
}

export function apiPut<T>(url: string, body?: Body): Promise<T> {
  return send<T>(url, "PUT", body);
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" });
}
