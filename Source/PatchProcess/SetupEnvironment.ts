/**
 * @module SetupEnvironment (PatchProcess)
 * @description An Effect that sets up essential process-level environment variables
 * and the current working directory.
 */

import { Effect } from "effect";

class ProcessPatchError extends Error {
	readonly _tag = "ProcessPatchError";
	constructor(
		readonly context: string,
		override readonly cause?: unknown,
	) {
		super(`Failed to patch Node.js process: ${context}`);
	}
}

/**
 * An Effect that sets the `VSCODE_CWD` environment variable if it is not already set.
 * This variable is used by some VS Code services and extensions to resolve relative paths.
 */
const SetVSCodeCWD = Effect.if(
	Effect.sync(() => typeof process.env["VSCODE_CWD"] !== "string"),
	{
		onTrue: () =>
			Effect.sync(() => {
				process.env["VSCODE_CWD"] = process.cwd();
			}).pipe(
				Effect.tap(() =>
					Effect.logTrace(
						"VSCODE_CWD environment variable set to current process cwd.",
					),
				),
			),
		onFalse: () =>
			Effect.logTrace(
				"VSCODE_CWD environment variable already set, skipping.",
			),
	},
);

/**
 * An Effect that, on Windows, changes the current working directory to the main
 * application's root directory. This mimics VS Code's behavior and can help
 * with consistent path resolution for native modules.
 */
const ChangeWorkingDirectoryOnWindows = Effect.if(
	process.platform === "win32" && !!process.env["MOUNTAIN_APP_ROOT"],
	{
		onTrue: () =>
			Effect.try({
				try: () => {
					const AppRoot = process.env["MOUNTAIN_APP_ROOT"]!;
					process.chdir(AppRoot);
					return AppRoot; // Return the path on success for logging
				},
				catch: (cause) =>
					new ProcessPatchError("ChangeWorkingDirectory", {
						cause,
					}),
			}).pipe(
				Effect.flatMap((AppRoot) =>
					Effect.logDebug(
						`Changed current working directory to '${AppRoot}' on Windows.`,
					),
				),
			),
		onFalse: () => Effect.void,
	},
);

/**
 * The main orchestrator Effect for environment setup. It composes the individual
 * setup Effects to ensure a consistent process environment.
 */
export const SetupEnvironment = Effect.all(
	[SetVSCodeCWD, ChangeWorkingDirectoryOnWindows],
	{ discard: true },
);
