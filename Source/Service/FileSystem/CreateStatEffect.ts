/**
 * @module CreateStatEffect
 * @description Creates an Effect for the `fs.stat` operation.
 */

import { Context, Effect } from "effect";
import { type FileStat, type Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import IPCService from "../IPC/Service.js";
import { FileSystemError, MapToVSCodeError } from "./Error/FileSystemError.js";

export default function (
	URI: Uri,
): Effect.Effect<FileStat, Error, typeof IPCService> {
	return Effect.gen(function* (_) {
		const IPC = yield* _(IPCService);
		const UriDTO = TypeConverter.URI.FromAPI(URI);
		const RawStat = yield* _(IPC.SendRequest<any>("$stat", [UriDTO]));
		return {
			type: RawStat.type,
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
