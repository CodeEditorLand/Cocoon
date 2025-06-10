/**
 * @module EnsureDirectory
 * @description Defines an `Effect` to idempotently create a directory.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import { FileSystem } from "../../FileSystem/mod.js";
import { Log } from "../../Log.js";

/**
 * An `Effect` that ensures a directory exists at the given `Uri`.
 *
 * It uses the `FileSystem` service to create the directory and gracefully
 * handles the case where the directory already exists, as `createDirectory`
 * is idempotent.
 *
 * @param DirectoryUri The optional `Uri` of the directory to create. If
 *   undefined, the effect does nothing.
 * @param ScopeName A friendly name for the directory's purpose (e.g.,
 *   "Global Storage"), used for logging.
 */
export const EnsureDirectory = (
	DirectoryUri: Uri | undefined,
	ScopeName: string,
) =>
	Effect.if(DirectoryUri, {
		onTrue: (Uri) =>
			Effect.gen(function* (_) {
				const Fs = yield* _(FileSystem.Tag);
				// The `createDirectory` method on the vscode.fs API is already idempotent.
				yield* _(
					Effect.tryPromise(() => Fs.createDirectory(Uri)),
					Effect.catchAll((Error) =>
						Log.Error(
							`Failed to ensure ${ScopeName} storage directory exists at ${Uri.toString()}`,
							Error,
						),
					),
				);
			}).pipe(
				Effect.tap(() =>
					Log.Trace(
						`${ScopeName} storage directory ensured at: ${Uri.fsPath}`,
					),
				),
			),
		onFalse: Effect.unit,
	});
