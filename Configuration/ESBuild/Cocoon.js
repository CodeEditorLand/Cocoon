var e =
		process.env.NODE_ENV === "development" ||
		process.env.TAURI_ENV_DEBUG === "true",
	r = process.env.Clean === "true",
	n = process.env.Bundle === "true",
	i = process.env.Compile === "true",
	a = {
		color: !0,
		format: "esm",
		logLevel: "debug",
		metafile: !0,
		minify: !e,
		outdir: "Configuration",
		platform: "node",
		target: "esnext",
		tsconfig: "tsconfig.json",
		write: !0,
		legalComments: e ? "inline" : "none",
		bundle: n,
		assetNames: "Asset/[name]-[hash]",
		sourcemap: e,
		drop: e ? [] : ["debugger"],
		ignoreAnnotations: !e,
		keepNames: e,
		plugins: [
			{
				name: "Target",
				setup({ onStart: o, initialOptions: { outdir: t } }) {
					!0 === (r === !0) &&
						o(async () => {
							try {
								t &&
									(await (
										await import("node:fs/promises")
									).rm(t, { recursive: !0 }));
							} catch (s) {
								console.log(s);
							}
						});
				},
			},
		],
		outbase: "Source/Configuration",
		loader: { ".json": "copy", ".sh": "copy" },
	},
	{ sep: p, posix: u } = await import("node:path");
export {
	n as Bundle,
	r as Clean,
	i as Compile,
	e as On,
	a as default,
	u as posix,
	p as sep,
};
