/**
 * @module Wrapper
 * @description Defines stubbed `Effect`s for clipboard operations at the
 * integration layer. This file is a placeholder to resolve import errors. A real
 * implementation would contain `Effect`s that call Tauri commands.
 */
import { Effect } from "effect";
import type { URI } from "../../../Platform/VSCode/Type.js";
import type { IntegrationClipboardProblem } from "./Problem.js";
export declare const WriteText: (_text: string) => Effect.Effect<void, never>;
export declare const ReadText: Effect.Effect<string, IntegrationClipboardProblem>;
export declare const WriteResourceList: (_resourceList: readonly (typeof URI)[]) => Effect.Effect<void, IntegrationClipboardProblem>;
export declare const ReadResourceList: Effect.Effect<(typeof URI)[], IntegrationClipboardProblem>;
export declare const HasResourceList: Effect.Effect<boolean, IntegrationClipboardProblem>;
