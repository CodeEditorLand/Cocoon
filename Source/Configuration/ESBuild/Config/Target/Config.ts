import { deepmerge } from "deepmerge-ts";
import type { BuildOptions } from "esbuild";

import * as Environment from "../../Constant/Environment/Constant.js";
import BaseConfig from "../Base/Config.js";

// Tier:*:Resolution 🟢 Primary - CocoonEsbuildDefine is exported by
// Maintain/Debug/Build.sh as a JSON blob of `__LandTier_<Name>__` keys.
// Each value is already JSON-stringified (double-quoted), which is the
// exact shape esbuild expects for `define`. Absent env var → empty map.
const TierDefines = (() => {
	const Raw = process.env["CocoonEsbuildDefine"];
	if (!Raw) return {};
	try {
		return JSON.parse(Raw) as Record<string, string>;
	} catch {
		return {};
	}
})();

export default async function TargetConfig(
	Current: BuildOptions,
): Promise<BuildOptions> {
	const Merged = deepmerge(BaseConfig, {
		outdir: "Target",
		bundle: Environment.Bundle,
		drop: Environment.On ? [] : ["debugger", "console"],
		define: {
			__DEV__: Environment.On ? "true" : "false",
			__INCREMENT__: `"${`${Environment.On ? "DEVELOPMENT" : "PRODUCTION"}-${(await import("ulid")).ulid()}`}"`,
			...TierDefines,
		},
		treeShaking: !Environment.On,
		entryPoints: (
			await import("@playform/build/Target/Function/Entry.js")
		).default(Current, ["Source/Configuration/*"]),
		platform: "node",
		outbase: "Source",
		...(Environment.Bundle
			? {
					packages: "external" as const,
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
				}
			: {}),
		plugins: Environment.Compile
			? deepmerge(Current.plugins || [], [
					{
						name: "Compile",
						setup({ onEnd }: any) {
							onEnd(async ({ metafile }: any) => {
								const _Output = metafile?.outputs;
								for (const Output in _Output) {
									if (
										Object.prototype.hasOwnProperty.call(
											_Output,
											Output,
										)
									) {
										if (Output.endsWith(".js")) {
											(
												await import("@playform/build/Target/Function/Exec.js")
											).default(
												`Build '${Output}' \
											--ESBuild Configuration/ESBuild/Config/CompileConfig.js \
											--TypeScript Configuration/tsconfig/Target/Compile.json`,
											);
										}
									}
								}
							});
						},
					},
				])
			: [],
	});

	return Merged as unknown as BuildOptions;
}
