/**
 * @module ReadRawFile
 * @description Defines a stubbed `Effect` for reading a file at the integration layer.
 * This file is a placeholder to resolve import errors. A real implementation
 * would contain an `Effect` that calls a Tauri command to read a file.
 */
import { Effect } from "effect";
import type { Uri } from "vscode";
export declare const ReadRawFile: (_Uri: Uri) => Effect.Effect<string, any>;
