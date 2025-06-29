/**
 * @module WorkSpace
 * @description Resolves the workspace path. In a Tauri context without a VS Code-like
 * multi-root workspace concept, this often defaults to a user-level directory.
 */

import { BaseDirectory, resolve } from "@tauri-apps/api/path";
import { Effect } from "effect";
import type { Uri } from "vscode";
import { URI } from "vscode-uri";

import { IntegrationPathProblem } from "./Problem.js";

/**
 * An Effect that resolves the path for workspace-specific settings.
 * For a standalone app, we can resolve this relative to the home directory
 * as a sensible default. A more complex implementation might get this path
- * from the `WorkSpaceService`.
 */
export const ResolveWorkSpacePath = (): Effect.Effect<
	Uri,
	IntegrationPathProblem
> =>
	Effect.tryPromise({
		// In this context, we'll treat the "workspace" as the app's config dir.
		// A more advanced implementation would get the actual open folder path.
		try: async () => {
			const workspaceConfigPath = await resolve(
				BaseDirectory.AppConfig.toString(),
			);
			return URI.file(workspaceConfigPath);
		},
		catch: (Cause) => new IntegrationPathProblem({ Cause }),
	});
