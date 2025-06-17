/*
 * File: Cocoon/Source/Service/FileSystem/CreateStatEffect.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:36 UTC
 * Dependency: ../../TypeConverter/Main.js, ../IPC/Service.js, effect, vscode
 */

/**
 * @module CreateStatEffect (FileSystem)
 * @description A factory function for creating an Effect that performs a
 * file `stat` operation via an IPC call to the main host.
 */

import { Effect } from "effect";
import type { FileStat, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import type IPCService from "../IPC/Service.js";

/**
 * Creates an Effect that, when run, will request file metadata from the host.
 *
 * @param uri The URI of the file to stat.
 * @param IPC An instance of the IPCService to use for the request.
 * @returns An `Effect` that resolves to a `FileStat` object or fails with an error.
 */
const CreateStatEffect = (
	uri: Uri,
	IPC: IPCService["Type"],
): Effect.Effect<FileStat, Error> => {
	return Effect.gen(function* () {
		const uriDTO = TypeConverter.URI.FromAPI(uri);
		const statDTO = yield* IPC.SendRequest<any>("$stat", [uriDTO]);

		// Assuming the DTO from the host matches the FileStat interface.
		// A more robust implementation might do a full type conversion.
		const fileStat: FileStat = {
			type: statDTO.type,
			ctime: statDTO.ctime,
			mtime: statDTO.mtime,
			size: statDTO.size,
			permissions: statDTO.permissions,
		};
		return fileStat;
	}).pipe(Effect.mapError((cause) => new Error(String(cause))));
};

export default CreateStatEffect;
