/*
 * File: Cocoon/Source/Service/WorkSpace/Support/FindFiles.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:00:34 UTC
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
		// A real implementation would acquire a token ID from the cancellation service
		const tokenID = token ? (token._id ?? 0) : 0;

		const resultDTOs = yield* IPC.SendRequest<any[]>("$findFiles", [
			include,
			exclude,
			maxResults,
			tokenID,
		]);

		return resultDTOs.map(TypeConverter.URI.ToAPI);
	});
}
