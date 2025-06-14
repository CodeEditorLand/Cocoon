/**
 * @module CreateStatEffect
 * @description Creates an Effect for the `fs.stat` operation.
 */

import { Effect } from "effect";
import type { FileStat, FileType, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
import { FileSystemError, MapToVSCodeError } from "./Error.js";

export function CreateStatEffect(URI: Uri) {
	return Effect.gen(function* (_) {
		const IPCService = yield* _(IPC.Tag);
		const UriDTO = TypeConverter.URIConverter.FromAPI(URI);
		const RawStat = yield* _(
			IPCService.SendRequest<any>("$stat", [UriDTO]),
		);
		return {
			type: RawStat.type as FileType,
			ctime: RawStat.ctime,
			mtime: RawStat.mtime,
			size: RawStat.size,
			permissions: RawStat.permissions,
		} as FileStat;
	}).pipe(
		Effect.mapError(
			(cause) =>
				new FileSystemError({ cause, operation: "Stat", uri: URI }),
		),
		Effect.catchTag("FileSystemError", (e) =>
			Effect.fail(MapToVSCodeError(e)),
		),
	);
}
