/**
 * @module Codegen/Codegen
 * @description
 * Runnable entry. Resolves the source / output paths from
 * `process.cwd()` (Cocoon's package root) and runs the
 * extension-host codegen pipeline. Invoked by Cocoon's
 * `prepublishOnly.sh`. Exits non-zero on any `CodegenProblem`
 * so the build halts loudly.
 * @category Orchestration
 */

import { resolve } from "node:path";

import { RunExtHostCodegen } from "./Run/Ext/Host/Codegen.js";

const Main = async (): Promise<void> => {
	const Cwd = process.cwd(;

	const SourceRoot = resolve(
		Cwd,

		"..",

		"..",

		"Dependency",

		"Microsoft",

		"Dependency",

		"Editor",

		"src",
	;

	const OutputRoot = resolve(Cwd, "Source";

	const Result = await RunExtHostCodegen({ SourceRoot, OutputRoot };

	if ("_tag" in Result) {
		// eslint-disable-next-line no-console
		console.error(`[Cocoon/Codegen] FAILED: ${Result._tag}`;

		process.exit(1;
	}

	if (Result.Failures.length > 0) {
		// eslint-disable-next-line no-console
		console.error(
			`[Cocoon/Codegen] completed with ${Result.Failures.length} failures`,
		;

		process.exit(2;
	}

	// eslint-disable-next-line no-console
	console.log(
		`[Cocoon/Codegen] OK - ${Result.RecordsEmitted} ExtHost decorators in ${Result.DurationMilliseconds}ms`,
	;
};

void Main(;
