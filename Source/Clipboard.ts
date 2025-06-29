/**
 * @module Clipboard
 * @description Defines the service for interacting with the system clipboard,
 * implementing the `vscode.Clipboard` contract.
 * This service proxies all clipboard operations to the native host (`Mountain`) via IPC.
 */

import { Effect, Runtime } from "effect";
import type { Clipboard } from "vscode";

import { ApplicationClipboardProblem } from "./Clipboard/ApplicationClipboardProblem.js";
import type { IntegrationClipboardProblem } from "./Integration/Tauri/Clipboard/Problem.js";
import { ReadText, WriteText } from "./Integration/Tauri/Clipboard/Wrapper.js";

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
 * @class ClipboardService
 * @description The `Effect.Service` for the Clipboard service. It provides
 * an implementation of VS Code's `vscode.Clipboard` interface, where each method
 * returns a `Promise` by running an underlying `Effect`.
 */
export class ClipboardService extends Effect.Service<ClipboardService>()(
	"vscode/ClipboardService",
	{
		sync: (): Clipboard => ({
			writeText: (text: string): Promise<void> => {
				return RunIntegrationEffect(WriteText(text));
			},
			readText: (): Promise<string> => {
				return RunIntegrationEffect(ReadText);
			},
		}),
	},
) {}
