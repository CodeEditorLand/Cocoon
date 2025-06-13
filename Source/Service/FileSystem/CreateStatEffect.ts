/**
 * @module CreateStatEffect
 * @description Creates an Effect for the `fs.stat` operation.
 */

import { Effect } from "effect";
import { FileType, type FileStat, type Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IpcProvider } from "../Ipc.js";
import { FileSystemError, MapToVscodeError } from "./Error.js";

export const CreateStatEffect = (Uri: Uri) =>
	Effect.gen(function* (_) {
		const Ipc = yield* _(IpcProvider.Tag);
		const UriDto = TypeConverter.Uri.fromApi(Uri);
		const RawStat = yield* _(
			Ipc.SendRequest<any>("workspacefs_stat", [UriDto]),
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
			Effect.fail(MapToVscodeError(e)),
		),
	);
