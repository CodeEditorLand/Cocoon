import e from "../Target/Config.js";

const r = (await import("deepmerge-ts")).deepmergeCustom({ mergeArrays: !1 });

var i = async (o) =>
	r(await e(o), {
		bundle: !0,
		outbase: "Target",
		tsconfig: "Configuration/tsconfig/Target/Compile.json",
		plugins: [],
		allowOverwrite: !0,
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
	});
export { i as default };
