/**
 * @module FindFiles (WorkSpace/Support)
 * @description An Effect for the `workspace.findFiles` API.
 */

import { Effect } from "effect";
import type { CancellationToken, GlobPattern, Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter/Main.js";
import CancellationService from "../../Cancellation/Service.js";
import type IPCService from "../../IPC/Service.js";

export default function (
	IPC: IPCService,
	include: GlobPattern,
	exclude: GlobPattern | null | undefined,
	maxResults: number | undefined,
	token: CancellationToken | undefined,
) {
	return Effect.gen(function* (_) {
		const Cancellation = yield* _(CancellationService);
		// A real implementation would acquire a token ID from the cancellation service
		const tokenID = token ? ((token as any)._id ?? 0) : 0;

		const resultDTOs = yield* _(
			IPC.SendRequest<any[]>("$findFiles", [
				include,
				exclude,
				maxResults,
				tokenID,
			]),
		);

		return resultDTOs.map(TypeConverter.URI.ToAPI);
	});
}
