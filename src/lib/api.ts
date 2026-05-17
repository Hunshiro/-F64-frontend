const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function readJsonSafely(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("tb_token");

  const headers: HeadersInit = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const err = await readJsonSafely(res);
    throw new Error(err?.message || `Request failed (${res.status})`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return (await readJsonSafely(res)) as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = localStorage.getItem("tb_token");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData
  });

  if (!res.ok) {
    const err = await readJsonSafely(res);
    throw new Error(err?.message || `Request failed (${res.status})`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return (await readJsonSafely(res)) as T;
}
