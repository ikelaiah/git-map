import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const THEME_KEY = "git-map-theme";

const FILES_THAT_TOUCH_THEME = [
  "src/app.js",
  "src/branch-map.js",
  "panic.html"
];

describe("cross-file constants", () => {
  it(`every theme-aware file references "${THEME_KEY}" verbatim`, () => {
    const offenders = [];
    FILES_THAT_TOUCH_THEME.forEach((file) => {
      const contents = fs.readFileSync(file, "utf8");
      if (!contents.includes(THEME_KEY)) {
        offenders.push(`${file} is missing the theme storage key "${THEME_KEY}"`);
      }
    });
    assert.equal(offenders.length, 0, offenders.join("\n"));
  });

  it("no file uses a near-miss theme key", () => {
    const nearMissPatterns = [
      /["']git-map-themes["']/,
      /["']gitmap-theme["']/,
      /["']git-map_theme["']/,
      /["']git_map_theme["']/,
      /["']gitMap-theme["']/
    ];
    const offenders = [];
    FILES_THAT_TOUCH_THEME.forEach((file) => {
      const contents = fs.readFileSync(file, "utf8");
      nearMissPatterns.forEach((pattern) => {
        if (pattern.test(contents)) {
          offenders.push(`${file} uses near-miss theme key matching ${pattern}`);
        }
      });
    });
    assert.equal(offenders.length, 0, offenders.join("\n"));
  });

  it("only known localStorage keys appear as string literals across the codebase", () => {
    const ALLOWED_KEYS = new Set([
      "git-map-theme",
      "git-helper-theme",
      "git-map-start-here-dismissed"
    ]);
    const SOURCE_FILES = [
      "src/app.js",
      "src/branch-map.js",
      "src/version.js",
      "src/panic.js",
      "src/panic-data.js",
      "src/data.js",
      "src/branch-map-model.js",
      "panic.html",
      "index.html",
      "branch-map.html"
    ];
    const offenders = [];
    const literalStringKey = /["']([a-z][a-z0-9-]{5,})["']/gi;
    SOURCE_FILES.forEach((file) => {
      const contents = fs.readFileSync(file, "utf8");
      const storageCallPattern = /localStorage\.(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g;
      let call;
      while ((call = storageCallPattern.exec(contents)) !== null) {
        const argument = call[1].trim();
        const literal = literalStringKey.exec(argument);
        literalStringKey.lastIndex = 0;
        if (literal && !ALLOWED_KEYS.has(literal[1])) {
          offenders.push(`${file} calls localStorage with unexpected literal key "${literal[1]}"`);
        }
      }
    });
    assert.equal(offenders.length, 0, offenders.join("\n"));
  });
});
