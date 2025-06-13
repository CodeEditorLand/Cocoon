/**
 * @module FindFiles (WorkSpace/Support)
 * @description An Effect for the `workspace.findFiles` API.
 */

import { Effect } from "effect";
import type { CancellationToken, GlobPattern, Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import { Cancellation } from "../../Cancellation/Service.js";
import { IPC } from "../../IPC.js";

export function FindFiles(
	IPCService: IPC.Interface,
	include: GlobPattern,
	exclude: GlobPattern | null | undefined,
	maxResults: number | undefined,
	token: CancellationToken | undefined,
) {
	return Effect.gen(function* (_) {
		const CancellationService = yield* _(Cancellation.Tag);
		// A real implementation would acquire a token ID from the cancellation service
		const tokenID = token ? Cancellation.getTokenID(token) : 0;

		const resultDTOs = yield* _(
			IPCService.SendRequest<any[]>("$findFiles", [
				include,
				exclude,
				maxResults,
				tokenID,
			]),
		);

		return resultDTOs.map(TypeConverter.URIConverter.ToAPI);
	});
}
