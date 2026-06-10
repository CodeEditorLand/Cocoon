import * as Environment from "../../Constant/Environment/Constant.js";

const BootstrapConfig = {

  color: true,

  format: "esm",

  logLevel: Environment.On ? "debug" : "info",

  minify: !Environment.On,

  platform: "node",

  target: "esnext",

  tsconfig: "tsconfig.json",

  write: true,

  bundle: true,

  sourcemap: Environment.On,

  treeShaking: true,

  legalComments: "none",

  drop: Environment.On ? [] : ["debugger"],

  keepNames: Environment.On,

  entryPoints: ["Source/Bootstrap/Implementation/Cocoon/Main.ts"],

  // outdir + outbase instead of outfile to avoid the outfile/outdir conflict
  // when deepmerged into @playform/build's default config (which has outdir).
  // With outbase = "Source/Bootstrap/Implementation/Cocoon", the single entry
  // point Main.ts maps to outdir/Main.js.
  outdir: "Target/Bootstrap/Implementation/Cocoon",

  outbase: "Source/Bootstrap/Implementation/Cocoon",

  // Only Node.js built-ins and host stubs - everything else is inlined.
  external: ["node:*", "vscode", "electron"],

  // CJS packages bundled into ESM use esbuild's __require2 shim which throws
  // "Dynamic require of X is not supported" unless a real `require` is in
  // scope. Banner injects createRequire so all CJS require() calls resolve.
  // Use a private alias to avoid clashing with bundled CJS modules that
  // also `import { createRequire } from "module"` at the top level.
  banner: {
    js: "import { createRequire as __cjsRequire } from 'module';\nconst require = __cjsRequire(import.meta.url);\n"
  },

  define: {
    __DEV__: Environment.On ? "true" : "false",

    "process.env.NODE_ENV": JSON.stringify(
      process.env["NODE_ENV"] || (Environment.On ? "development" : "production")
    )
  },

  loader: {
    ".json": "json"
  }
};

var Config_default = BootstrapConfig;

export {
  Config_default as default
};

//# sourceMappingURL=Config.js.map
