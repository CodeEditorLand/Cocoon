import { deepmerge } from "deepmerge-ts";
import type { BuildOptions } from "esbuild";

import * as Environment from "../Constant/EnvironmentConstant.js";
import BaseConfig from "./BaseConfig.js";

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
