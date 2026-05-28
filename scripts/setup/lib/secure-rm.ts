import { execFileSync } from "node:child_process";
import { unlink } from "node:fs/promises";

export async function secureRm(path: string): Promise<void> {
  try {
    if (process.platform === "darwin") {
      execFileSync("rm", ["-P", path]);
      return;
    }

    if (process.platform === "linux") {
      execFileSync("shred", ["-u", path]);
      return;
    }

    const crypto = await import("node:crypto");
    const fs = await import("node:fs/promises");
    const stat = await fs.stat(path);
    await fs.writeFile(path, crypto.randomBytes(stat.size));
    await unlink(path);
  } catch {
    try {
      await unlink(path);
    } catch {
      // Already gone.
    }
  }
}
