import TargetConfig from "./TargetConfig.js";

var __defProp = Object.defineProperty;
var __name = (target, value) =>
	__defProp(target, "name", { value, configurable: true });

const Merge = (await import("deepmerge-ts")).deepmergeCustom({
	mergeArrays: false,
});
var CompileConfig_default = /* @__PURE__ */ __name(
	async (Current) =>
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
		}),
	"default",
);
export { CompileConfig_default as default };
//# sourceMappingURL=CompileConfig.js.map
