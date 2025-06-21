/**
 * @module EnsureDirectory (Support)
 * @description Defines an Effect to idempotently create a directory, ensuring it
 * exists for services like storage.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import FileSystemService from "../../FileSystem/Service.js";
import LogService from "../../Log/Service.js";

/**
 * An `Effect` that ensures a directory exists at the given `URI`.
 *
 * It uses the `FileSystem` service to create the directory and gracefully
 * handles the case where the directory already exists, as `createDirectory`
 * is idempotent.
 *
 * @param DirectoryURI The optional `URI` of the directory to create. If
 *   undefined, the effect does nothing.
 * @param ScopeName A friendly name for the directory's purpose (e.g.,
 *   "Global Storage"), used for logging.
 * @returns An `Effect` that resolves to `true` if the directory was ensured
 *   or `false` if the URI was not provided.
 */
const EnsureDirectory = (
	DirectoryURI: Uri | undefined,
	ScopeName: string,
): Effect.Effect<boolean, never, FileSystemService | LogService> => {
	// Conditionally execute based on whether the DirectoryURI is defined.
	return Effect.if(DirectoryURI !== undefined, {
		// If the URI is defined, ensure the directory exists.
		onTrue: () =>
			Effect.gen(function* () {
				// The condition guarantees DirectoryURI is not undefined here.
				const URI = DirectoryURI!;
				const Fs = yield* FileSystemService;

				// Create the directory. The underlying `createDirectory` is idempotent.
				yield* Effect.tryPromise(() => Fs.createDirectory(URI)).pipe(
					// If creation fails, log the error.
					Effect.catchAll((Error) =>
						LogService.pipe(
							Effect.flatMap((Log) =>
								Log.Error(
									`Failed to ensure ${ScopeName} storage directory exists at ${URI.toString()}`,
									Error,
								),
							),
						),
					),
				);

				// Log that the directory has been successfully ensured.
				yield* LogService.pipe(
					Effect.flatMap((Log) =>
						Log.Trace(
							`${ScopeName} storage directory ensured at: ${URI.fsPath}`,
						),
					),
				);

				return true;
			}),
		// If the URI is not defined, log a trace message and return false.
		onFalse: () =>
			LogService.pipe(
				Effect.flatMap((Log) =>
					Log.Trace(
						`${ScopeName} storage URI is not defined; skipping creation.`,
					),
				),
				Effect.as(false),
			),
	});
};

export default EnsureDirectory;
