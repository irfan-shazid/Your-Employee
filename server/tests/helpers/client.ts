import type { Hono } from "hono";

let nextIp = 1;

/**
 * A fake app user: keeps its own cookie jar and a unique client IP (so per-IP rate limits
 * behave like real separate devices).
 */
export class TestClient {
  private cookies = new Map<string, string>();
  readonly ip = `10.0.0.${nextIp++}`;

  constructor(private readonly app: Hono<any>) {}

  get signedIn() {
    return [...this.cookies.keys()].some((k) => k.endsWith("session_token"));
  }

  async request(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
    const headers: Record<string, string> = { Origin: "http://localhost:8081", "X-Forwarded-For": this.ip, ...extraHeaders };
    if (body !== undefined && !(body instanceof URLSearchParams)) headers["Content-Type"] = "application/json";
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");

    const res = await this.app.request(`http://localhost:4000${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof URLSearchParams ? body : JSON.stringify(body),
    });

    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const eq = pair!.indexOf("=");
      const name = pair!.slice(0, eq).trim();
      const value = pair!.slice(eq + 1).trim();
      if (value && !/max-age=0/i.test(cookie)) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }

    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* HTML or plain text */
    }
    return { status: res.status, body: data };
  }

  get = (path: string) => this.request("GET", path);
  post = (path: string, body: unknown = {}) => this.request("POST", path, body);
  put = (path: string, body: unknown) => this.request("PUT", path, body);
  patch = (path: string, body: unknown) => this.request("PATCH", path, body);
  delete = (path: string) => this.request("DELETE", path);

  signUp(name: string, email: string, password = "Password123") {
    return this.post("/api/auth/sign-up/email", { name, email, password });
  }

  signIn(email: string, password: string) {
    return this.post("/api/auth/sign-in/email", { email, password });
  }
}
