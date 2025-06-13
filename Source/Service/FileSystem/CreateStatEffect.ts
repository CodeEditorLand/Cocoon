/**
 * @module CreateStatEffect
 * @description Creates an Effect for the `fs.stat` operation.
 */

import { Effect } from "effect";
import { FileType, type FileStat, type Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IPCProvider } from "../IPC.js";
import { FileSystemError, MapToVSCodeError } from "./Error.js";

export const CreateStatEffect = (Uri: Uri) =>
	Effect.gen(function* (_) {
		const IPC = yield* _(IPCProvider.Tag);
		const UriDTO = TypeConverter.Uri.fromAPI(Uri);
		const RawStat = yield* _(
			IPC.SendRequest<any>("workspacefs_stat", [UriDTO]),
		);
		return {
			type: RawStat.type ?? FileType.Unknown,
			ctime: RawStat.ctime,
			mtime: RawStat.mtime,
			size: RawStat.size,
			permissions: RawStat.permissions,
		} as FileStat;
	}).pipe(
		Effect.mapError(
			(cause) =>
				new FileSystemError({ cause, operation: "Stat", uri: Uri }),
		),
		Effect.catchTag("FileSystemError", (e) =>
			Effect.fail(MapToVSCodeError(e)),
		),
	);
