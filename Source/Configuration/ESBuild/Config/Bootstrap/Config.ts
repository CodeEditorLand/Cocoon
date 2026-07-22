import type { BuildOptions } from "esbuild";

import * as Environment from "../../Constant/Environment/Constant.js";

/**
 * ESBuild config for the self-contained Bootstrap bundle.
 *
 * Unlike the Target build (which uses `packages: "external"` and relies on
 * node_modules being present at runtime), this config inlines every npm
 * dependency into a single file. The result is deployed inside the .app
 * bundle at Contents/Resources/Cocoon/Target/Bootstrap/Implementation/Cocoon/
 * Main.js, where no node_modules directory exists.
 *
 * All Cocoon runtime deps (effect, @effect/platform-node, @grpc/grpc-js, …)
 * are pure JavaScript - no native .node bindings - so full inlining is safe.
 * Only Node.js built-ins (node:*) and the vscode/electron stubs that are
 * never reached at runtime are kept external.
 */
const BootstrapConfig: BuildOptions = {

	color: true,

	format: "esm",

	logLevel: Environment.On ? "debug" : "info",

	minify: !Environment.On,

	platform: "node",

	target: "esnext",

	tsconfig: "tsconfig.json",

	write: true,

	bundle: true,

	sourcemap: Environment.On,

	treeShaking: true,

	legalComments: "none",

	drop: Environment.On ? [] : ["debugger"],

	keepNames: Environment.On,

	entryPoints: ["Source/Bootstrap/Implementation/Cocoon/Main.ts"],

	// outdir + outbase instead of outfile to avoid the outfile/outdir conflict
	// when deepmerged into @playform/build's default config (which has outdir).
	// With outbase = "Source/Bootstrap/Implementation/Cocoon", the single entry
	// point Main.ts maps to outdir/Main.js.
	outdir: "Target/Bootstrap/Implementation/Cocoon",

	outbase: "Source/Bootstrap/Implementation/Cocoon",

	// Only Node.js built-ins and host stubs - everything else is inlined.
	external: ["node:*", "vscode", "electron"],

	// CJS packages bundled into ESM use esbuild's __require2 shim which throws
	// "Dynamic require of X is not supported" unless a real `require` is in
	// scope. Banner injects createRequire so all CJS require() calls resolve.
	// Use a private alias to avoid clashing with bundled CJS modules that
	// also `import { createRequire } from "module"` at the top level.
	banner: {
		js: "import { createRequire as __cjsRequire } from 'module';\nconst require = __cjsRequire(import.meta.url);\n",
	},

	define: {
		__DEV__: Environment.On ? "true" : "false",

		"process.env.NODE_ENV": JSON.stringify(
			process.env["NODE_ENV"] ||
				(Environment.On ? "development" : "production"),
		),
	},

	loader: {
		".json": "json",
	},
};

export default BootstrapConfig;
