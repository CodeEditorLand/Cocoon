/**
 * @module Wrapper
 * @description Defines Effect-based wrappers for Tauri's clipboard plugin.
 */
import { Effect } from "effect";
import { IntegrationClipboardProblem } from "./Problem.js";
/**
 * An Effect that wraps the Tauri `clipboard.writeText` command.
 */
export declare const WriteText: (text: string) => Effect.Effect<void, IntegrationClipboardProblem>;
/**
 * An Effect that wraps the Tauri `clipboard.readText` command.
 */
export declare const ReadText: Effect.Effect<string, IntegrationClipboardProblem>;
//# sourceMappingURL=Wrapper.d.ts.map