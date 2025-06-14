/**
 * @module EnsureDirectory
 * @description Defines an `Effect` to idempotently create a directory.
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
 */
export default function (DirectoryURI: Uri | undefined, ScopeName: string) {
	return Effect.if(DirectoryURI, {
		onTrue: (URI) =>
			Effect.gen(function* (_) {
				const Fs = yield* _(FileSystemService);
				// The `createDirectory` method on the vscode.fs API is already idempotent.
				yield* _(
					Effect.tryPromise(() => Fs.createDirectory(URI)),
					Effect.catchAll((Error) =>
						Effect.flatMap(LogService, (Log) =>
							Log.Error(
								`Failed to ensure ${ScopeName} storage directory exists at ${URI.toString()}`,
								Error,
							),
						),
					),
				);
			}).pipe(
				Effect.tap(() =>
					Effect.flatMap(LogService, (Log) =>
						Log.Trace(
							`${ScopeName} storage directory ensured at: ${URI.fsPath}`,
						),
					),
				),
			),
		onFalse: () =>
			Effect.flatMap(LogService, (Log) =>
				Log.Trace(
					`${ScopeName} storage URI is not defined; skipping creation.`,
				),
			),
	});
}
