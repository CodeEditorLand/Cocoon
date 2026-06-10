// Source/ESBuild.ts
var Clean = process.env["Clean"] === "true";
var Meta = process.env["Meta"] === "true";
var On = process.env["NODE_ENV"] === "development" || process.env["TAURI_ENV_DEBUG"] === "true";
var ESBuild_default = {
  color: true,
  format: "esm",
  logLevel: On ? "debug" : "silent",
  metafile: Meta,
  minify: !On,
  outbase: "Source/Configuration",
  outdir: "Configuration",
  platform: "node",
  target: "esnext",
  tsconfig: "tsconfig.json",
  write: true,
  legalComments: On ? "inline" : "none",
  bundle: false,
  assetNames: "Asset/[name]-[hash]",
  sourcemap: On,
  drop: On ? [] : ["debugger"],
  ignoreAnnotations: !On,
  keepNames: On,
  plugins: [
    {
      name: "Target",
      // @ts-ignore
      setup({ onStart, initialOptions: { outdir } }) {
        switch (true) {
          case Clean === true:
            onStart(async () => {
              try {
                outdir ? await (await import("node:fs/promises")).rm(outdir, {
                  recursive: true
                }) : {};
              } catch (_Error) {
                console.log(_Error);
              }
            });
            break;
          default:
            break;
        }
      }
    }
  ],
  loader: {
    ".json": "copy",
    ".sh": "copy"
  }
};
var { sep, posix } = await import("node:path");
export {
  Clean,
  Meta,
  On,
  ESBuild_default as default,
  posix,
  sep
};
//# sourceMappingURL=ESBuild.js.map
