/**
 * @module Wrapper
 * @description Defines stubbed `Effect`s for clipboard operations at the
 * integration layer. This file is a placeholder to resolve import errors. A real
 * implementation would contain `Effect`s that call Tauri commands.
 */

import { Effect } from "effect";
import type { URI } from "../../../Platform/VSCode/Type.js";
import { IntegrationClipboardProblem } from "./Error.js";

const MakeStub = <T>(Name: string, DefaultValue: T) =>
	Effect.logWarning(
		`Clipboard Integration: Function '${Name}' is a stub.`,
	).pipe(Effect.as(DefaultValue));

export const WriteText = (Text: string): Effect.Effect<void, never> =>
	MakeStub("WriteText", undefined);
export const ReadText: Effect.Effect<string, IntegrationClipboardProblem> =
	MakeStub("ReadText", "");

export const WriteResourceList = (
	ResourceList: (typeof URI)[],
): Effect.Effect<void, IntegrationClipboardProblem> =>
	MakeStub("WriteResourceList", undefined);
export const ReadResourceList: Effect.Effect<
	(typeof URI)[],
	IntegrationClipboardProblem
> = MakeStub("ReadResourceList", []);
export const HasResourceList: Effect.Effect<
	boolean,
	IntegrationClipboardProblem
> = MakeStub("HasResourceList", false);
export const ReadImage: Effect.Effect<Uint8Array, IntegrationClipboardProblem> =
	MakeStub("ReadImage", new Uint8Array());
