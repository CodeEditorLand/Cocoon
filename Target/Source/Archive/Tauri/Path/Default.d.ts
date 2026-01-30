/**
 * @module Default
 * @description Resolves the default application configuration path using Tauri's API.
 */
import { Effect } from "effect";
import type { Uri } from "vscode";
import { IntegrationPathProblem } from "./Problem.js";
/**
 * An Effect that resolves the path to the application's configuration directory.
 * This is typically where user-level `settings.json` would reside.
 */
export declare const ResolveFinalDefaultPath: () => Effect.Effect<Uri, IntegrationPathProblem>;
//# sourceMappingURL=Default.d.ts.map