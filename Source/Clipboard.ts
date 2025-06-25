/**
 * @module Clipboard
 * @description Defines the service for interacting with the system clipboard,
 * implementing the `IClipboardService` contract from VS Code for high fidelity.
 * This service proxies all clipboard operations to the native host (`Mountain`) via IPC.
 */

import { Effect, Runtime } from "effect";
import type { URI } from "./Platform/VSCode/Type.js";
import { ApplicationClipboardProblem } from "./Clipboard/ApplicationClipboardProblem.js";

// --- NOTE: Integration-level imports are placeholders as the source was not provided. ---
import type { IntegrationClipboardProblem } from "./Integration/Tauri/Clipboard/Problem.js";
import {
	ReadImage,
	ReadResourceList,
	ReadText,
	WriteResourceList,
	WriteText,
	HasResourceList,
} from "./Integration/Tauri/Clipboard/Wrapper.js";

/**
 * @description An internal helper to bridge the declarative Effect world with the
 * imperative, promise-based VS Code interface. It executes an integration-layer
 * `Effect`, maps any `IntegrationClipboardProblem` to a domain-specific
 * `ApplicationClipboardProblem`, and returns the result as a `Promise`.
 * @param IntegrationEffect The `Effect` from the integration layer to run.
 * @returns A `Promise` that resolves with the success value of the `Effect`.
 */
const RunIntegrationEffect = <SuccessType>(
	IntegrationEffect: Effect.Effect<SuccessType, IntegrationClipboardProblem>,
): Promise<SuccessType> => {
	const MappedEffect = Effect.mapError(
		IntegrationEffect,
		(Cause) => new ApplicationClipboardProblem({ Cause }),
	);
	// The default runtime is used here as this is an API boundary.
	return Runtime.runPromise(Runtime.defaultRuntime, MappedEffect);
};

/**
 * @class Clipboard
 * @description The `Effect.Service` for the Clipboard service. It provides
 * an implementation of VS Code's `IClipboardService`, where each method
 * returns a `Promise` by running an underlying `Effect`.
 */
export class ClipboardService extends Effect.Service<ClipboardService>()(
	"vscode/ClipboardService",
	{
		sync: () => ({
			_serviceBrand: undefined,

			triggerPaste: (
				_TargetWindowId: number,
			): Promise<void> | undefined => {
				// This is a complex UI interaction and is stubbed for now.
				return undefined;
			},

			writeText: (Text: string): Promise<void> => {
				return RunIntegrationEffect(WriteText(Text));
			},

			readText: (): Promise<string> => {
				return RunIntegrationEffect(ReadText);
			},

			readFindText: function (): Promise<string> {
				return this.readText();
			},

			writeFindText: function (Text: string): Promise<void> {
				return this.writeText(Text);
			},

			writeResources: (ResourceList: (typeof URI)[]): Promise<void> => {
				return RunIntegrationEffect(WriteResourceList(ResourceList));
			},

			readResources: (): Promise<(typeof URI)[]> => {
				return RunIntegrationEffect(ReadResourceList);
			},

			hasResources: (): Promise<boolean> => {
				return RunIntegrationEffect(HasResourceList);
			},

			readImage: (): Promise<Uint8Array> => {
				return RunIntegrationEffect(ReadImage);
			},
		}),
	},
) {}
