import { describe, it, expect } from "vitest";
import manifest from "../manifest.json";

describe("manifest.json content_scripts", () => {
  const dataBridgeEntry = manifest.content_scripts.find((cs) =>
    cs.js.includes("dist/data-bridge.js"),
  );
  const contentEntry = manifest.content_scripts.find((cs) =>
    cs.js.includes("dist/content.js"),
  );

  it("data-bridge.js matches only YouTube URLs", () => {
    expect(dataBridgeEntry).toBeDefined();
    expect(dataBridgeEntry!.matches).toEqual([
      "*://www.youtube.com/*",
      "*://youtube.com/*",
    ]);
    for (const url of dataBridgeEntry!.matches) {
      expect(url).not.toMatch(/google/);
    }
  });

  it("content.js matches both YouTube and Google URLs", () => {
    expect(contentEntry).toBeDefined();
    expect(contentEntry!.matches).toContain("*://www.youtube.com/*");
    expect(contentEntry!.matches).toContain("*://youtube.com/*");
    expect(contentEntry!.matches).toContain("*://www.google.com/search*");
    expect(contentEntry!.matches).toContain("*://google.com/search*");
  });
});
