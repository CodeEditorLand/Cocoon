/**
 * @module CreateStatEffect
 * @description Creates an Effect for the `fs.stat` operation.
 */

import { Effect } from "effect";
import type { FileStat, Uri } from "vscode";

import { URI as URIConverter } from "../../TypeConverter/Main.js";
import IPCService from "../IPC/Service.js";
import { FileSystemError, MapToVSCodeError } from "./Error.js";

const CreateStatEffect = (
	URI: Uri,
): Effect.Effect<FileStat, Error, IPCService> => {
	return Effect.gen(function* () {
		const IPC = yield* IPCService;
		const UriDTO = URIConverter.FromAPI(URI);
		const RawStat = yield* IPC.SendRequest<any>("$stat", [UriDTO]);
		return {
			type: RawStat.type,
			ctime: RawStat.ctime,
			mtime: RawStat.mtime,
			size: RawStat.size,
			permissions: RawStat.permissions,
		} as FileStat;
	}).pipe(
		Effect.mapError(
			(Cause) =>
				new FileSystemError({
					cause: Cause,
					operation: "Stat",
					uri: URI,
				}),
		),
		Effect.catchTag("FileSystemError", (Error) =>
			Effect.fail(MapToVSCodeError(Error)),
		),
	);
};

export default CreateStatEffect;
