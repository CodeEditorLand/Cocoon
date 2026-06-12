/**
 * @module Codegen/RunExtHostCodegen
 * @description
 * Top-level Cocoon codegen orchestrator. Walks the same VS Code
 * source tree Wind walks, but narrows the iterator to the
 * extension-host subtree (`vs/workbench/api/{common,browser,worker,
 * electron-browser}/extHost*.ts`) and emits Cocoon-side schemas
 * under `Cocoon/Source/Effect/Generated/`.
 *
 * Reuses every Wind extractor and resolver verbatim - no parser
 * duplication. Only the file-name predicate (`IsExtHostFile`) and
 * the emitted output paths differ.
 *
 * Invoked from Cocoon's `prepublishOnly.sh` ahead of the TS
 * compile, same shape as Wind. Returns a typed
 * `RunExtHostCodegenSummary | CodegenProblem` for the runner shell
 * to surface a clean exit code.
 * @category Orchestration
 */

import { existsSync } from "node:fs";

// @ts-ignore — Wind Codegen types; resolved from Target at runtime
import type { CodegenProblem } from "@codeeditorland/wind/Target/Codegen/Type/CodegenProblem.js";
// @ts-ignore — Wind Codegen types; resolved from Target at runtime
import { WalkSourceTree } from "@codeeditorland/wind/Target/Codegen/Walk/SourceTreeWalker.js";

import { EmitExtHostSchema } from "../../../Emit/Emit/Ext/Host/Schema.js";
import { IterateExtHostDecorators } from "../../../Extract/Iterate/Ext/Host/Decorators.js";
import type { ExtHostDecoratorRecord } from "../../../Type/Ext/Host/Decorator/Record.js";

export interface RunExtHostCodegenOptions {
	readonly SourceRoot: string;

	readonly OutputRoot: string;

	readonly Log?: (message: string) => void;
}

export interface RunExtHostCodegenSummary {
	readonly RecordsEmitted: number;

	readonly Failures: ReadonlyArray<CodegenProblem>;

	readonly DurationMilliseconds: number;
}

const DefaultLog = (message: string): void => {
	// eslint-disable-next-line no-console
	console.log(`[Cocoon/Codegen] ${message}`;
};

export const RunExtHostCodegen = async (
	options: RunExtHostCodegenOptions,
): Promise<RunExtHostCodegenSummary | CodegenProblem> => {
	const Log = options.Log ?? DefaultLog;

	const Started = performance.now(;

	if (!existsSync(options.SourceRoot)) {
		return {
			_tag: "CodegenSourceTreeMissing",

			path: options.SourceRoot,
		};
	}

	Log(`source root: ${options.SourceRoot}`;

	Log(`output root: ${options.OutputRoot}`;

	const Files = WalkSourceTree({
		Root: options.SourceRoot,
		IncludeExtensions: [".ts"],
		ExcludeSegments: [],
	};

	const Records: ExtHostDecoratorRecord[] = [];

	const Failures: CodegenProblem[] = [];

	for await (const Record of IterateExtHostDecorators(Files)) {
		Records.push(Record;

		const Outcome = await EmitExtHostSchema({
			Record,
			OutputRoot: options.OutputRoot,
		};

		if ("_tag" in Outcome) {
			Failures.push(Outcome;

			Log(`failed ${Record.DecoratorName}: ${Outcome._tag}`;

			continue;
		}

		Log(
			`emitted ${Outcome.OutputPath} (${Outcome.Members} members, ${Outcome.Bytes}B)`,
		;
	}

	const Elapsed = Math.round(performance.now() - Started;

	Log(`done in ${Elapsed}ms - ${Records.length} extension-host decorators`;

	return {
		RecordsEmitted: Records.length,

		Failures,

		DurationMilliseconds: Elapsed,
	};
};

export default RunExtHostCodegen;
