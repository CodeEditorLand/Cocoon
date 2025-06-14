/**
 * @module FileSystemError (FileSystem/Error)
 * @description Defines custom errors and error handling for the FileSystem service.
 */

import { Data } from "effect";
import { FileSystemError as VscFileSystemError, type Uri } from "vscode";

/**
 * A tagged error for filesystem operations that wraps the underlying cause,
 * typically an IPC or gRPC error.
 */
export class FileSystemError extends Data.TaggedError("FileSystemError")<{
	readonly cause: unknown;
	readonly operation: string;
	readonly uri?: Uri;
}> {}

/**
 * Maps a generic error from an RPC call into a specific `vscode.FileSystemError`.
 * This provides extensions with the familiar, expected error types.
 * @param error The `FileSystemError` containing the original cause.
 * @returns A new `vscode.FileSystemError` instance.
 */
export function MapToVSCodeError(error: FileSystemError): VscFileSystemError {
	const cause = error.cause as any;
	const uri = error.uri;

	if (
		cause?.code === "EntryNotFound" ||
		cause?.message?.includes("not found")
	) {
		return VscFileSystemError.FileNotFound(uri);
	}
	if (cause?.code === "EntryExists" || cause?.message?.includes("exists")) {
		return VscFileSystemError.FileExists(uri);
	}
	if (cause?.code === "NoPermissions") {
		return VscFileSystemError.NoPermissions(uri);
	}
	// Add other mappings for codes like 'FileIsADirectory', 'FileNotADirectory', etc.

	const message = cause instanceof Error ? cause.message : String(cause);
	return new VscFileSystemError(
		`${error.operation} failed for ${uri?.toString() ?? "unknown resource"}: ${message}`,
	);
}
