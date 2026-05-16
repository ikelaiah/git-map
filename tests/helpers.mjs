import fs from "node:fs";
import vm from "node:vm";

export function loadBrowserGlobals(files) {
  const context = { window: {} };
  vm.createContext(context);
  files.forEach((file) => {
    const code = fs.readFileSync(file, "utf8");
    vm.runInContext(code, context, { filename: file });
  });
  return context.window;
}
