/**
 * @module Services/Window/FileDialogs
 * @description
 * File open and save dialog implementations for the Window service.
 * Delegates to Mountain's native file dialog via gRPC.
 *
 * Source: src/vs/workbench/api/common/extHostWindow.ts (showOpenDialog, showSaveDialog)
 *
 * TODO(EFX-30): Convert Effect.gen → async/await when Window/Index.ts callers migrate.
 */

import type * as VSCode from "vscode";

import { ToDTO as OpenDialogOptionToDTO } from "../../../TypeConverter/Dialog/Open/Dialog/Option.js";
import { ToDTO as SaveDialogOptionToDTO } from "../../../TypeConverter/Dialog/Save/Dialog/Option.js";

/**
 * Show a file open dialog.
 *
 * Serializes options via TypeConverter/Dialog/OpenDialogOption and delegates
 * to Mountain's native file dialog via gRPC. Returns an array of selected
 * URIs or undefined if the user cancelled.
 *
 * @param MountainClient - gRPC client for Mountain communication
 * @param Logger - Logger for debug output
 * @param Options - Optional open dialog configuration
 */
export const ShowOpenDialog = (
	MountainClient: {
		sendRequest: (method: string, params: unknown[]) => Promise<unknown>;
	},

	Logger: { Debug: (Message: string) => Promise<void> },

	Options?: VSCode.OpenDialogOptions,
): Promise<VSCode.Uri[] | undefined> =>
	async function() {
		yield* Logger.Debug(`[WindowService] Showing open dialog`;

		// Serialize options using TypeConverter
		const OptionsDTO = OpenDialogOptionToDTO(Options;

		// Delegates to Mountain's native file dialog implementation via gRPC
		const Result = yield* Effect.tryPromise({
			try: async () => {
				const Response = await MountainClient.sendRequest(
					"UserInterface.ShowOpenDialog",

					[OptionsDTO],
				;

				if (Response === null || Response === undefined) {
					return undefined;
				}

				// Response is an array of file paths - convert to VSCode URIs
				const FilePaths = Response as string[];

				const { Uri } = await import("vscode";

				return FilePaths.map((Path) => Uri.file(Path);
			},
			catch: (Error_) => {
				throw new Error(
					`Failed to show open dialog: ${(Error_ as Error).message}`,
				;
			},
		};

		return Result;
	};

/**
 * Show a file save dialog.
 *
 * Serializes options via TypeConverter/Dialog/SaveDialogOption and delegates
 * to Mountain's native file dialog via gRPC. Returns the selected URI or
 * undefined if the user cancelled.
 *
 * @param MountainClient - gRPC client for Mountain communication
 * @param Logger - Logger for debug output
 * @param Options - Optional save dialog configuration
 */
export const ShowSaveDialog = (
	MountainClient: {
		sendRequest: (method: string, params: unknown[]) => Promise<unknown>;
	},

	Logger: { Debug: (Message: string) => Promise<void> },

	Options?: VSCode.SaveDialogOptions,
): Promise<VSCode.Uri | undefined> =>
	async function() {
		yield* Logger.Debug(`[WindowService] Showing save dialog`;

		// Serialize options using TypeConverter
		const OptionsDTO = SaveDialogOptionToDTO(Options;

		// Delegates to Mountain's native file dialog implementation via gRPC
		const ResultURI = yield* Effect.tryPromise({
			try: async () => {
				const Response = await MountainClient.sendRequest(
					"UserInterface.ShowSaveDialog",

					[OptionsDTO],
				;

				if (Response === null || Response === undefined) {
					return undefined;
				}

				// Response is a file path string - convert to VSCode URI
				const FilePath = Response as string;

				const { Uri } = await import("vscode";

				return Uri.file(FilePath;
			},
			catch: (Error_) => {
				throw new Error(
					`Failed to show save dialog: ${(Error_ as Error).message}`,
				;
			},
		};

		return ResultURI
			? await(async () => {
					const { Uri } = await import("vscode";

					return Uri.parse(ResultURI.toString();
				})()
			: undefined;
	};
