/**
 * @module WorkSpace
 * @description Resolves the workspace path. In a Tauri context without a VS Code-like
 * multi-root workspace concept, this often defaults to a user-level directory.
 */
import { Effect } from "effect";
import type { Uri } from "vscode";
import { IntegrationPathProblem } from "./Problem.js";
/**
 * An Effect that resolves the path for workspace-specific settings.
 * For a standalone app, we can resolve this relative to the home directory
 * as a sensible default. A more complex implementation might get this path
- * from the `WorkSpaceService`.
 */
export declare const ResolveWorkSpacePath: () => Effect.Effect<Uri, IntegrationPathProblem>;
//# sourceMappingURL=WorkSpace.d.ts.map