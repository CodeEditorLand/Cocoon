/**
 * @module Default
 * @description Resolves the default application configuration path using Tauri's API.
 */

import { BaseDirectory, resolve } from "@tauri-apps/api/path";
import { Effect } from "effect";
import type { Uri } from "vscode";
import { URI } from "vscode-uri";

import { IntegrationPathProblem } from "./Problem.js";

/**
 * An Effect that resolves the path to the application's configuration directory.
 * This is typically where user-level `settings.json` would reside.
 */
export const ResolveFinalDefaultPath = (): Effect.Effect<
	Uri,
	IntegrationPathProblem
> =>
	Effect.tryPromise({
		try: async () => {
			// BaseDirectory.AppConfig is the cross-platform standard for this.
			const appConfigPath = await resolve(
				BaseDirectory.AppConfig.toString(),
			);
			return URI.file(appConfigPath);
		},
		catch: (Cause) => new IntegrationPathProblem({ Cause }),
	});
