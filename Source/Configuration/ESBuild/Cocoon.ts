import type { BuildOptions } from "esbuild";

export * from "./Constant/EnvironmentConstant.js";

export { default as BaseConfig } from "./Config/BaseConfig.js";
export { default as TargetConfig } from "./Config/TargetConfig.js";
export { default as CompileConfig } from "./Config/CompileConfig.js";

/**
 * ESBuild configuration for Cocoon that properly handles TypeScript generators
 * with `yield*` syntax in ES modules environment.
 *
 * This is the canonical external list for Cocoon's build pipeline.
 * The actual build uses Config/TargetConfig.ts and Config/CompileConfig.ts
 * which inherit this external array.
 */
export const CocoonESBuildConfig: BuildOptions = {
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
		"node:*",
	],
	jsx: "preserve",
	loader: {
		".ts": "ts",
		".tsx": "tsx",
	},
	supported: {
		"generator-function": true,
		"async-generator": true,
	},
	define: {
		"process.env.NODE_ENV": JSON.stringify(
			process.env.NODE_ENV || "production",
		),
	},
	resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
	tsconfig: "tsconfig.json",
};

export const CocoonESBuildDevConfig: BuildOptions = {
	...CocoonESBuildConfig,
	sourcemap: true,
	minify: false,
	define: {
		"process.env.NODE_ENV": JSON.stringify("development"),
	},
};

export const CocoonESBuildProdConfig: BuildOptions = {
	...CocoonESBuildConfig,
	sourcemap: false,
	minify: true,
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
};
