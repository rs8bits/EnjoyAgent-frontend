import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./MarketHubPage.vue", import.meta.url), "utf8");

describe("MarketHub install trigger contract", () => {
  it("supports both explicit button clicks and native keyboard form submission", () => {
    expect(source).toMatch(/<form[\s\S]*?@submit\.prevent="installSelectedAsset"/);
    expect(source).toMatch(/<button\s+type="button"[\s\S]*?:disabled="installingAsset"[\s\S]*?@click="installSelectedAsset"/);
  });

  it("guards the handler before it mutates install state", () => {
    expect(source).toMatch(/async function installSelectedAsset\(\) \{\s+if \(installingAsset\.value\) \{\s+return;/);
  });

  it("keeps the whole middle column scrollable without a collapsing grid row", () => {
    expect(source).toContain('<div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">');
    expect(source).not.toContain("xl:grid-rows-[auto_minmax(0,1fr)]");
  });

  it("uses two columns at 1280px and waits until 2xl for the three-column workbench", () => {
    expect(source).toContain("xl:grid-cols-[minmax(280px,0.72fr)_minmax(420px,1.28fr)]");
    expect(source).toContain("2xl:grid-cols-[300px_minmax(420px,1fr)_360px]");
    expect(source).not.toContain("xl:grid-cols-[300px_minmax(0,1fr)_360px]");
    expect(source).toContain("xl:col-span-2 2xl:col-span-1");
  });
});
