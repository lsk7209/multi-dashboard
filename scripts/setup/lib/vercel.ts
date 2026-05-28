export interface VercelEnvPayload {
  key: string;
  value: string;
  target?: "production" | "preview" | "development";
}

export class VercelClient {
  constructor(
    private readonly token: string,
    private readonly projectId: string,
  ) {}

  async upsertEnv(payload: VercelEnvPayload): Promise<void> {
    await this.deleteEnvByKey(payload.key);

    const response = await fetch(`https://api.vercel.com/v10/projects/${this.projectId}/env`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: payload.key,
        value: payload.value,
        type: "encrypted",
        target: [payload.target ?? "production"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Vercel env create failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
  }

  private async deleteEnvByKey(key: string): Promise<void> {
    const listResponse = await fetch(`https://api.vercel.com/v9/projects/${this.projectId}/env`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!listResponse.ok) {
      throw new Error(`Vercel env list failed ${listResponse.status}: ${(await listResponse.text()).slice(0, 300)}`);
    }

    const body = (await listResponse.json()) as { envs?: Array<{ id: string; key: string }> };
    const matches = body.envs?.filter((env) => env.key === key) ?? [];

    for (const env of matches) {
      const deleteResponse = await fetch(`https://api.vercel.com/v9/projects/${this.projectId}/env/${env.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        throw new Error(`Vercel env delete failed ${deleteResponse.status}: ${await deleteResponse.text()}`);
      }
    }
  }
}
