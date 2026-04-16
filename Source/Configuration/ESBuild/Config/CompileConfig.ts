import type { BuildOptions } from "esbuild";

import TargetConfig from "./TargetConfig.js";

const Merge = (await import("deepmerge-ts")).deepmergeCustom({
	mergeArrays: false,
});

export default async (Current: BuildOptions): Promise<BuildOptions> =>
	Merge(await TargetConfig(Current), {
		bundle: true,
		outbase: "Target",
		tsconfig: "Configuration/tsconfig/Target/Compile.json",
		plugins: [],
		allowOverwrite: true,
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
	}) as unknown as BuildOptions;
