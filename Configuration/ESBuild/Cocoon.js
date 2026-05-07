export * from "./Constant/Environment/Constant.js";
import { default as default2 } from "./Config/Base/Config.js";
import { default as default3 } from "./Config/Target/Config.js";
import { default as default4 } from "./Config/Compile/Config.js";
const CocoonESBuildConfig = {
  entryPoints: ["Source/**/*.ts"],
  outdir: "Target",
  bundle: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  sourcemap: true,
  external: [
    "@playform/build",
    "vscode",
    "electron",
    "@effect/*",
    "@grpc/grpc-js",
    "@grpc/proto-loader",
    "google-protobuf",
    "protobufjs",
    "node:*"
  ],
  jsx: "preserve",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  },
  supported: {
    "generator-function": true,
    "async-generator": true
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "production"
    )
  },
  resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  tsconfig: "tsconfig.json"
};
const CocoonESBuildDevConfig = {
  ...CocoonESBuildConfig,
  sourcemap: true,
  minify: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("development")
  }
};
const CocoonESBuildProdConfig = {
  ...CocoonESBuildConfig,
  sourcemap: false,
  minify: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  }
};
export {
  default2 as BaseConfig,
  CocoonESBuildConfig,
  CocoonESBuildDevConfig,
  CocoonESBuildProdConfig,
  default4 as CompileConfig,
  default3 as TargetConfig
};
//# sourceMappingURL=Cocoon.js.map
