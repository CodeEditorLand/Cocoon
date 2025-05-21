/*---------------------------------------------------------------------------------------------
 // Header: Added basic header 
* Cocoon Language Models Shim (language-models-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostLanguageModels` service (or a relevant subset).
 * This service is responsible for managing access to language models (e.g., for chat,
 * 
 * inline completions) and providing information about them to extensions.
 *
 * In this shim, it primarily provides a stub for `createLanguageModelAccessInformation`,
 * 
 * which is needed by `ExtHostExtensionService` when constructing the `ExtensionContext`.
 *
 * Responsibilities:
 * - `createLanguageModelAccessInformation(extension)`: Returns an object indicating if an
 *   extension has access to language models and an event for when this access changes.
 * - Stubbing RPC methods (`$acceptChatParticipants`, `$acceptLanguageModels`) called by
 *   the main thread to update the ext host's knowledge of available models/participants.
 *
 * Key Interactions:
 * - Used by `ExtHostExtensionService` to populate `ExtensionContext.languageModels`.
 * - Would receive updates from `MainThreadLanguageModels` via RPC in a full implementation.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// IDisposable is not directly used by the current stub but would be for real event emitters.
// import { IDisposable } from "vs/base/common/lifecycle";

import type {
	ChatResponseFragment,
	LanguageModelChatMessage,
	LanguageModelChatResponse,
	LanguageModelError,
	LanguageModelInformation,
	LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
} from "vscode";

// For API types

// --- Type Definitions ---

// Re-defining IExtHostLanguageModels based on common patterns and methods seen in VS Code.
// TODO: This should ideally be imported from `vs/workbench/api/common/extHostLanguageModels.ts` or similar.
export interface IExtHostLanguageModels {
	readonly _serviceBrand: undefined;

	/**
	 * Creates an object that provides information about an extension's access to language models.
	 */
	createLanguageModelAccessInformation(
		extension: IExtensionDescription,

		// Use vscode.LanguageModelAccessInformation
	): VscodeLanguageModelAccessInformation;

	// RPC methods called by MainThreadLanguageModels
	$acceptChatParticipants?(
		participants: /* LanguageModelChatParticipantDto[] */ any[],
	): void;

	$acceptLanguageModels?(models: /* LanguageModelDto[] */ any[]): void;

	$updateLanguageModels?(event: {
		added?: LanguageModelInformation[];

		removed?: string[];
	}): void;

	$provideLanguageModelResponse?(
		handle: number,

		requestId: number,

		response: ChatResponseFragment | LanguageModelError,

		isLast: boolean,
	): Promise<void>;

	// TODO: Add other methods from the real IExtHostLanguageModels if needed for a more complete shim
	// e.g., methods for extensions to request chat, select models, etc.
}

export class ShimExtHostLanguageModels implements IExtHostLanguageModels {
	public readonly _serviceBrand: undefined;

	constructor() {
		console.log(
			"[Cocoon Shim] ShimExtHostLanguageModels initialized (basic stub).",
		);

		// TODO: If this service needs to receive RPC calls, it should register itself with the RPC service:
		// if (rpcService) {

		//    rpcService.set(ExtHostContext.ExtHostLanguageModels, this);

		// }
	}

	public createLanguageModelAccessInformation(
		extension: IExtensionDescription,
	): VscodeLanguageModelAccessInformation {
		console.log(
			`[Cocoon Shim] createLanguageModelAccessInformation for ${extension.identifier.value} (stub: access denied, no change event).`,
		);

		// For a basic shim, always deny access and provide a NOP event.
		// A more advanced shim might check initData or an allow-list.
		return Object.freeze({
			// Ensure the returned object is immutable if appropriate
			get accessAllowed(): boolean {
				return false;
			},

			// onDidChange should be a real event, even if it never fires in a simple stub.
			// Using VscodeEvent.None is standard for NOP events.
			onDidChange: VscodeEvent.None,
		});
	}

	// --- Stubbed RPC methods called BY Mountain ---
	// These methods would update the state of available models/participants if implemented.

	public $acceptChatParticipants(
		participants: /* LanguageModelChatParticipantDto[] */ any[],
	): void {
		console.log(
			`[Cocoon Shim] $acceptChatParticipants called with ${participants.length} participants. (No-op)`,
		);

		// TODO: In a full implementation:
		// 1. Revive DTOs into internal participant representations.
		// 2. Update a local cache/registry of participants.
		// 3. Fire an event (e.g., onDidChangeChatParticipants).
	}

	public $acceptLanguageModels(models: /* LanguageModelDto[] */ any[]): void {
		console.log(
			`[Cocoon Shim] $acceptLanguageModels called with ${models.length} models. (No-op)`,
		);

		// TODO: In a full implementation:
		// 1. Revive DTOs into internal model representations.
		// 2. Update a local cache/registry of models.
		// 3. Fire an event (e.g., onDidChangeLanguageModels).
	}

	public $updateLanguageModels(event: {
		added?: LanguageModelInformation[];

		removed?: string[];
	}): void {
		console.log(
			`[Cocoon Shim] $updateLanguageModels called. Added: ${event.added?.length || 0}, Removed: ${event.removed?.length || 0}. (No-op)`,
		);

		// TODO: Implement full logic for adding/removing models and firing corresponding events.
	}

	public async $provideLanguageModelResponse(
		handle: number,

		requestId: number,

		response: ChatResponseFragment | LanguageModelError,

		isLast: boolean,
	): Promise<void> {
		console.log(
			`[Cocoon Shim] $provideLanguageModelResponse for handle ${handle}, request ${requestId}. IsLast: ${isLast}. (No-op)`,
		);

		// TODO: This method is crucial for streaming responses from a language model back to an extension's request.
		// It would involve looking up a pending request (identified by `handle` and `requestId`)
		// and forwarding the `response` fragment to the extension's listener/stream.
	}

	// TODO: Implement methods that extensions would call to interact with language models,

	// e.g., `vscode.lm.sendChatRequest`, `vscode.lm.getLanguageModels`.
	// These would typically involve making RPC calls to MainThreadLanguageModels.
	// Example:
	// public async sendChatRequest(
	//    extension: IExtensionDescription,

	//    modelId: string,

	//    messages: LanguageModelChatMessage[],

	// LanguageModelChatRequestOptions
	//    options: any,

	//    token: CancellationToken
	// Or a stream/async iterable
	// ): Promise<LanguageModelChatResponse> {

	//    this._log(`sendChatRequest for ${extension.id} to model ${modelId}`);

	//    if (!this.#mainThreadLanguageModelsProxy) {

	//        throw new Error("Language models service proxy not available.");

	//    }

	// ... make RPC call ...
	//
	// this.#mainThreadLanguageModelsProxy.$sendChatRequest(...);

	//
	//    throw new Error("sendChatRequest not implemented in shim");

	// }
}
