// For Extension type

// For event types
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For disposable event listeners
import { IDisposable } from "vs/base/common/lifecycle";
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";

// Define the interfaces based on VS Code's IExtHostLanguageModels and related types.
// These are simplified versions; the actual interfaces might be more complex.

// Interface for the object returned by createLanguageModelAccessInformation
export interface LanguageModelAccessInformation {
	readonly accessAllowed: boolean;

	// Event fires when access changes
	readonly onDidChange: VscodeEvent<void>;
}

// Interface for the Language Model Chat Participant (simplified)
export interface LanguageModelChatParticipant {
	id: string;

	// ... other properties
}

// Interface for the Language Model (simplified)
export interface LanguageModel {
	id: string;

	// ... other properties
}

// Interface for IExtHostLanguageModels (simplified based on usage)
export interface IExtHostLanguageModels {
	readonly _serviceBrand: undefined;

	createLanguageModelAccessInformation(
		extension: IExtensionDescription,
	): LanguageModelAccessInformation;

	$acceptChatParticipants?(
		participants: LanguageModelChatParticipant[],
	): void;

	$acceptLanguageModels?(models: LanguageModel[]): void;

	// Add other methods from the real IExtHostLanguageModels if needed
}

export class ShimExtHostLanguageModels implements IExtHostLanguageModels {
	public readonly _serviceBrand: undefined;

	constructor() {
		console.log("[Cocoon Shim] ShimExtHostLanguageModels initialized.");
	}

	// Core function needed by _loadExtensionContext in extension-service-shim
	public createLanguageModelAccessInformation(
		extension: IExtensionDescription,
	): LanguageModelAccessInformation {
		console.log(
			`[Cocoon Shim] createLanguageModelAccessInformation for ${extension.identifier.value}`,
		);

		// Return a basic stub object implementing the interface
		return {
			get accessAllowed(): boolean {
				// Default to false for MVP shim, or make this configurable/dynamic if needed
				return false;
			},

			// Provide a NOP event emitter for onDidChange
			// Using VS Code's standard NOP event
			onDidChange: VscodeEvent.None,
		};
	}

	// Stub other RPC methods called by the main thread if they exist in the full interface
	public $acceptChatParticipants(
		participants: LanguageModelChatParticipant[],
	): void {
		console.log(
			`[Cocoon Shim] $acceptChatParticipants called with ${participants.length} participants. (No-op)`,
		);

		// In a real implementation, this would update internal state and fire events.
	}

	public $acceptLanguageModels(models: LanguageModel[]): void {
		console.log(
			`[Cocoon Shim] $acceptLanguageModels called with ${models.length} models. (No-op)`,
		);

		// In a real implementation, this would update internal state and fire events.
	}

	// Example of a method that might provide language models to extensions

	// async getLanguageModels(extension: IExtensionDescription, options?: any): Promise<LanguageModel[]> {

	//     console.log(`[Cocoon Shim] getLanguageModels for ${extension.identifier.value} - STUB`);

	//     return [];

	// }
}

// Original JS export
// module.exports = { ShimExtHostLanguageModels };

// `export class ...` handles this in TS.
