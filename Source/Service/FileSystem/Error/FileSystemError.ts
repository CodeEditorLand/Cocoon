/*
 * File: Cocoon/Source/Service/FileSystem/Error/FileSystemError.ts
 * Responsibility: Defines custom errors and error handling for the FileSystem service.
 *
 * Last-Modified: 2025-06-18
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
 * @param Error The `FileSystemError` containing the original cause.
 * @returns A new `vscode.FileSystemError` instance.
 */
export const MapToVSCodeError = (
	Error: FileSystemError,
): VscFileSystemError => {
	const Cause: any = Error.cause;
	const URI = Error.uri;

	// Safely access properties on the `cause` object.
	const CauseCode =
		Cause && typeof Cause === "object" && "code" in Cause
			? String(Cause.code)
			: "";
	const CauseMessage =
		Cause && typeof Cause === "object" && "message" in Cause
			? String(Cause.message)
			: String(Cause);

	if (CauseCode === "EntryNotFound" || CauseMessage.includes("not found")) {
		return VscFileSystemError.FileNotFound(URI);
	}
	if (CauseCode === "EntryExists" || CauseMessage.includes("exists")) {
		return VscFileSystemError.FileExists(URI);
	}
	if (CauseCode === "NoPermissions") {
		return VscFileSystemError.NoPermissions(URI);
	}
	// Add other mappings for codes like 'FileIsADirectory', 'FileNotADirectory', etc.

	return new VscFileSystemError(
		`${Error.operation} failed for ${URI?.toString() ?? "unknown resource"}: ${CauseMessage}`,
	);
};
