import * as Environment from "../../Constant/Environment/Constant.js";

var Config_default = {
	color: true,
	format: "esm",
	logLevel: Environment.On ? "debug" : "info",
	metafile: Environment.On,
	minify: !Environment.On,
	outdir: "Configuration",
	platform: "node",
	target: "esnext",
	tsconfig: "tsconfig.json",
	write: true,
	legalComments: Environment.On ? "inline" : "none",
	bundle: Environment.Bundle,
	assetNames: "Asset/[name]-[hash]",
	sourcemap: Environment.On,
	drop: Environment.On ? [] : ["debugger"],
	ignoreAnnotations: !Environment.On,
	keepNames: Environment.On,
	plugins: [
		{
			name: "Target",
			// @ts-ignore
			setup({ onStart, initialOptions: { outdir } }) {
				switch (true) {
					case Environment.Clean === true:
						onStart(async () => {
							try {
								outdir
									? await (
											await import("node:fs/promises")
										).rm(outdir, {
											recursive: true,
										})
									: {};
							} catch (_Error) {
								console.log(_Error);
							}
						});
						break;
					default:
						break;
				}
			},
		},
	],
	outbase: "Source/Configuration",
	loader: {
		".json": "copy",
		".sh": "copy",
	},
};
export { Config_default as default };
//# sourceMappingURL=Config.js.map
