import type { BuildOptions } from "esbuild";

export const On = (await import("./Cocoon.js")).On;

export const Bundle = (await import("./Cocoon.js")).Bundle;

export const Compile = (await import("./Cocoon.js")).Compile;

export const Merge = (await import("deepmerge-ts")).deepmerge;

/**
 * @module ESBuild
 *
 */
export default async (Current: BuildOptions): Promise<BuildOptions> =>
	Merge<[BuildOptions, BuildOptions]>(
		(await import("./Cocoon.js")).default,

		{
			outdir: "Target",

			drop: On ? [] : ["debugger", "console"],

			define: {
				__DEV__: On ? "true" : "false",

				__INCREMENT__: `"${`${On ? "DEVELOPMENT" : "PRODUCTION"}-${(await import("ulid")).ulid()}`}"`,
			},

			treeShaking: !On,

			entryPoints: (
				await import("@playform/build/Target/Function/Entry.js")
			).default(Current, ["Source/Configuration/*"]),

			platform: "node",

			outbase: "Source",

			plugins: Compile
				? Merge<[BuildOptions["plugins"], BuildOptions["plugins"]]>(
						Current.plugins,

						[
							{
								name: "Compile",

								setup({ onEnd }) {
									onEnd(async ({ metafile }) => {
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
														await import(
															"@playform/build/Target/Function/Exec.js"
														)
													).default(
														`Build '${Output}' \
															--ESBuild Configuration/ESBuild/Target/Compile.js \
															--TypeScript Configuration/tsconfig/Target/Compile.json`,
													);
												}
											}
										}
									});
								},
							},
						],
					)
				: [],
		},
	);
