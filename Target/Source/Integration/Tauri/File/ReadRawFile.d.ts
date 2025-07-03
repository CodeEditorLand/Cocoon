/**
 * @module ReadRawFile
 * @description Defines an Effect for reading a raw text file using Tauri's FS plugin.
 */
import { Effect } from "effect";
import type { Uri } from "vscode";
import { IntegrationConfigurationProblem } from "../Configuration/Problem.js";
/**
 * An Effect that reads the content of a file at a given URI as a string.
 * It uses the `fs.readTextFile` command from the Tauri FS plugin.
 */
export declare const ReadRawFile: (Uri: Uri) => Effect.Effect<string, IntegrationConfigurationProblem>;
//# sourceMappingURL=ReadRawFile.d.ts.map