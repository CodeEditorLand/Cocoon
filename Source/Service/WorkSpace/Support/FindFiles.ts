/*
 * File: Cocoon/Source/Service/WorkSpace/Support/FindFiles.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:15 UTC
 * Dependency: ../../../TypeConverter/Main.js, ../../IPC/Service.js, effect, vscode
 */

/**
 * @module FindFiles (WorkSpace/Support)
 * @description An Effect for the `workspace.findFiles` API.
 */

import { Effect } from "effect";
import type { CancellationToken, GlobPattern } from "vscode";

import * as TypeConverter from "../../../TypeConverter/Main.js";
import type IPCService from "../../IPC/Service.js";

export default function (
	IPC: IPCService["Type"],
	include: GlobPattern,
	exclude: GlobPattern | null | undefined,
	maxResults: number | undefined,
	token: CancellationToken | undefined,
) {
	return Effect.gen(function* () {
		// A real implementation would acquire a token ID from the cancellation service.
		// For now, we pass a placeholder ID. The `_id` property is internal to VS Code's
		// CancellationTokenSource and not on the public interface.
		const TokenID = token ? 1 : 0; // Placeholder logic

		const ResultDTOs = yield* IPC.SendRequest<any[]>("$findFiles", [
			include,
			exclude,
			maxResults,
			TokenID,
		]);

		return ResultDTOs.map(TypeConverter.URI.ToAPI);
	});
}
