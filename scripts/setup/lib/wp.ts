import { requireWordPressRestBase, type Site } from "./sites.js";

export interface WpUser {
  id: number;
  slug?: string;
  roles?: string[];
}

export interface WpApplicationPassword {
  uuid: string;
  name: string;
  password?: string;
}

export interface WpClientOptions {
  base: string;
  auth: {
    user: string;
    password: string;
  };
}

export class WpClient {
  private readonly base: string;
  private readonly authHeader: string;

  constructor(options: WpClientOptions) {
    this.base = options.base.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(`${options.auth.user}:${options.auth.password}`).toString("base64")}`;
  }

  async findUserBySlug(slug: string): Promise<WpUser | undefined> {
    const users = await this.request<WpUser[]>(`/users?slug=${encodeURIComponent(slug)}&context=edit`);
    return users[0];
  }

  async getUser(userId: number): Promise<WpUser> {
    return this.request<WpUser>(`/users/${userId}?context=edit`);
  }

  async createUser(payload: {
    username: string;
    email: string;
    password: string;
    roles: string[];
    name: string;
  }): Promise<WpUser> {
    return this.request<WpUser>("/users", {
      method: "POST",
      body: payload,
    });
  }

  async updateUser(userId: number, payload: { roles?: string[] }): Promise<WpUser> {
    return this.request<WpUser>(`/users/${userId}`, {
      method: "POST",
      body: payload,
    });
  }

  async deleteUser(userId: number, payload: { reassign: number; force: true }): Promise<void> {
    const params = new URLSearchParams({
      force: String(payload.force),
      reassign: String(payload.reassign),
    });
    await this.request<unknown>(`/users/${userId}?${params.toString()}`, { method: "DELETE" });
  }

  async listApplicationPasswords(userId: number): Promise<WpApplicationPassword[]> {
    return this.request<WpApplicationPassword[]>(`/users/${userId}/application-passwords?context=edit`);
  }

  async deleteApplicationPassword(userId: number, uuid: string): Promise<void> {
    await this.request<unknown>(`/users/${userId}/application-passwords/${uuid}`, { method: "DELETE" });
  }

  async createApplicationPassword(userId: number, name: string): Promise<Required<WpApplicationPassword>> {
    return this.request<Required<WpApplicationPassword>>(`/users/${userId}/application-passwords`, {
      method: "POST",
      body: { name },
    });
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.base}${path}`, init);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WordPress API ${response.status}: ${body.slice(0, 300)}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export function makeWpClient(site: Site, auth: WpClientOptions["auth"]): WpClient {
  return new WpClient({ base: requireWordPressRestBase(site), auth });
}
