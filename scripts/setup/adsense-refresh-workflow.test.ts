import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import YAML from "yaml";
describe("scheduled partial AdSense coverage persistence",()=>{
  it("allows partial snapshot publication before marking the job failed",()=>{
    const workflow=YAML.parse(readFileSync(".github/workflows/update-stats.yml","utf8"));
    const steps=workflow.jobs["update-stats"].steps as Array<Record<string,unknown>>;
    const collect=steps.findIndex(step=>step.id==="adsense");
    const commit=steps.findIndex(step=>step.name==="Commit updated snapshot");
    const fail=steps.findIndex(step=>step.name==="Report partial AdSense collection after saving coverage");
    expect(collect).toBeGreaterThan(-1);
    expect(steps[collect]?.["continue-on-error"]).toBe(true);
    expect(steps[collect]?.run).toBe("pnpm inventory:adsense");
    expect(commit).toBeGreaterThan(collect);
    expect(steps[commit]?.run).toContain("data/adsense-account-status-current.json");
    expect(steps[commit]?.run).toContain("git push");
    expect(fail).toBeGreaterThan(commit);
    expect(steps[fail]?.if).toContain("steps.adsense.outcome == 'failure'");
    expect(steps[fail]?.run).toContain("exit 1");
  });
});
