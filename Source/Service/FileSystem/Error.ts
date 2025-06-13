/**
 * @module Error (FileSystem)
 * @description Defines custom errors and error handling for the FileSystem service.
 */

import { Data, Effect } from "effect";
import { FileSystemError as VSCodeFileSystemError, type Uri } from "vscode";

/**
 * A tagged error for filesystem operations that wraps the underlying cause.
 */
export class FileSystemError extends Data.TaggedError("FileSystemError")<{
	readonly cause: unknown;
	readonly operation: string;
	readonly uri?: Uri;
}> {}

/**
 * Maps a generic error from an RPC call into a specific `vscode.FileSystemError`.
 * @param error - The FileSystemError containing the original cause.
 * @returns A new `vscode.FileSystemError` instance.
 */
export const MapToVSCodeError = (
	error: FileSystemError,
): VSCodeFileSystemError => {
	const cause = error.cause as any;
	const uri = error.uri;

	if (cause?.code === "ENOENT" || cause?.message?.includes("not found")) {
		return VSCodeFileSystemError.FileNotFound(uri);
	}
	if (cause?.code === "EEXIST" || cause?.message?.includes("exists")) {
		return VSCodeFileSystemError.FileExists(uri);
	}
	if (cause?.code === "EPERM" || cause?.code === "EACCES") {
		return VSCodeFileSystemError.NoPermissions(uri);
	}
	// Add other mappings...

	const message = cause instanceof Error ? cause.message : String(cause);
	return new VSCodeFileSystemError(
		`${error.operation} failed for ${uri?.toString() ?? "unknown resource"}: ${message}`,
	);
};
