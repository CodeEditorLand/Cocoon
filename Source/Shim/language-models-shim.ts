/*---------------------------------------------------------------------------------------------
 * Cocoon Language Models Shim (language-models-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostLanguageModels` service interface, which provides the foundation
 * for the `vscode.lm` (Language Models) API. This service is responsible for managing
 * language model providers contributed by extensions, handling chat requests from
 * extensions to these models, and facilitating the streaming of responses.
 *
 * For Cocoon's MVP (Minimum Viable Product), this shim focuses on:
 * - Establishing the structural basis for the `vscode.lm` API to function.
 * - Defining and implementing the necessary RPC shapes for communication with a
 *   `MainThreadLanguageModels` service presumed to exist on the Mountain host.
 * - Implementing `createLanguageModelAccessInformation()` to allow extensions to query
 *   their general access rights to language models.
 * - Providing basic registration for `ChatResponseProvider` instances via
 *   `registerChatResponseProvider(extension, identifier, provider, metadata)`.
 * - Handling `sendChatRequest(extension, modelId, messages, options, token)` calls by:
 *   - Performing simplified access and authentication checks.
 *   - Proxying chat requests to `MainThreadLanguageModels` (e.g., via `$tryStartChatRequest`).
 *   - Managing streaming responses using the internal `LanguageModelResponseShim` class, *     which processes fragments received from Mountain via `$provideLanguageModelResponse`.
 * - Offering token counting capabilities, either by calling a local provider's method
 *   or by proxying the request to Mountain via RPC.
 * - Handling updates to language model metadata and access lists pushed from Mountain.
 *
 * Limitations in MVP:
 * - **Type Conversion:** The conversion between VS Code API types (e.g., `VscodeLanguageModelChatMessage2`
 *   with its rich content parts like tool calls and data buffers) and RPC DTOs
 *   (e.g., `RpcChatMessage`) is currently STUBBED or SIMPLIFIED in `localApiTypeConverters`.
 *   A full, robust implementation of these converters is critical for supporting all
 *   features of the `vscode.lm` API and is a major TODO.
 * - **Authentication:** Authentication flows beyond a basic access list check are simplified.
 *   Full integration with `IExtHostAuthentication` for obtaining sessions is not implemented.
 * - **Advanced Features:** Complex error handling, detailed model capabilities reporting, *   and advanced request options (like tools, variables, agent participants beyond simple
 *   messages) are largely stubbed or not fully supported.
 *
 * Key Interactions:
 * - Registered with Dependency Injection (DI) in `Cocoon/index.ts` as `IExtHostLanguageModels`.
 * - The `vscode.lm` API, when made available to extensions (likely via the API factory), *   delegates its calls to this service instance.
 * - Communicates extensively with `MainContext.MainThreadLanguageModels` on Mountain via RPC.
 * - Is an RPC service target for calls from Mountain, identified by
 *   `ExtHostContext.ExtHostChatProvider` (this is VS Code's conventional context ID for
 *   language model related services on the ExtHost side).
 * - May interact with an injected `IExtHostAuthentication` service for access control
 *   (currently simplified in this MVP).
 * - Uses `BaseCocoonShim` for common utilities (logging, RPC proxy, error refinement).
 *
 *--------------------------------------------------------------------------------------------*/

import { AsyncIterableObject, AsyncIterableSource } from "vs/base/common/async";
import type { VSBuffer } from "vs/base/common/buffer";
import {
	CancellationToken,
	CancellationTokenSource,
} from "vs/base/common/cancellation";
import {
	CancellationError,
	SerializedError,
	transformErrorForSerialization,
	transformErrorFromSerialization,
} from "vs/base/common/errors";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Iterable } from "vs/base/common/iterator";
import {
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
// VS Code's internal URI for consistency if needed
import { URI, type UriComponents } from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	ExtensionIdentifierMap,
	ExtensionIdentifierSet,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// Progress<T> type is used in some LanguageModelChatRequestOptions, though not directly processed by this shim's core logic.
// import { Progress } from "vs/platform/progress/common/progress";

import {
	ExtHostContext,
	MainContext,
	// For sending complex data containing VSBuffers via RPC
	SerializableObjectWithBuffers,
	// RPC shape this service implements for calls from MainThread
	type ExtHostLanguageModelsShape,
	// RPC shape for the MainThread service proxy
	type MainThreadLanguageModelsShape,
	// DTO for chat messages in RPC
	type IChatMessage as RpcChatMessage,
	// DTO for streamed response parts
	type IChatResponseFragment as RpcChatResponseFragment,
	// DTO for model metadata
	type ILanguageModelChatMetadata as RpcLanguageModelChatMetadata,
	// DTO for model metadata changes
	type ILanguageModelsChangeEvent as RpcLanguageModelsChangeEvent,
	// Other DTOs from extHost.protocol.ts that might be relevant for full type conversion:
	// type IChatRequestVariableData, type IChatVariableData, type IChatVariableResolverProgressDto,
	// type IRelaxedChatMessage, type IChatDto, type IChatResponseDto, type IChatWelcomeMessage,
	// type ILanguageModelToolsCandidate, type IToolCallHistory,
} from "vs/workbench/api/common/extHost.protocol";
// For auth logic dependency
import type { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication";
// For vscode API type constructors (e.g., LanguageModelTextPart)
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
// Internal types for chat parts, useful for DTO conversion understanding.
import {
	type ChatRequestTextPart /*, type ChatRequestToolPart, type ChatRequestAgentPart */,
} from "vs/workbench/contrib/chat/common/chatRequestParser";
import type {
	IChatResponsePart /*, ChatAgentHover, ChatAgentKakkarHistoryEntry */,
} from "vs/workbench/contrib/chat/common/languageModels";
// For default metadata
import { DEFAULT_MODEL_PICKER_CATEGORY } from "vs/workbench/contrib/chat/common/modelPicker/modelPickerWidget";
// For auth logic hack/simplification
import { INTERNAL_AUTH_PROVIDER_PREFIX } from "vs/workbench/services/authentication/common/authentication";
// For proposed API checks if needed
// import { checkProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";

// Import from public 'vscode' API definition (from Cocoon's bundled API shim)
import {
	LanguageModelChatMessageRole as VscodeLanguageModelChatMessageRole,
	// Public API Error type for language models
	LanguageModelError as VscodeLanguageModelError,
	type CancellationToken as VscodeCancellationToken,
	type ChatResponseProvider as VscodeChatResponseProvider,
	type ChatResponseProviderMetadata as VscodeChatResponseProviderMetadata,
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	// The API object for a specific model
	type LanguageModelChat as VscodeLanguageModelChat,
	// Using the '2' version with rich content parts
	type LanguageModelChatMessage2 as VscodeLanguageModelChatMessage2,
	type LanguageModelChatRequestOptions as VscodeLanguageModelChatRequestOptions,
	// API object for a response stream
	type LanguageModelChatResponse as VscodeLanguageModelChatResponse,
	// Union of Text, Tool, Data parts
	type LanguageModelChatResponsePart as VscodeLanguageModelChatResponsePart,
	type LanguageModelChatSelector as VscodeLanguageModelChatSelector,
	// Constructor is extHostTypes.LanguageModelDataPart
	// type LanguageModelDataPart as VscodeLanguageModelDataPart,

	// Constructor is extHostTypes.LanguageModelTextPart
	// type LanguageModelTextPart as VscodeLanguageModelTextPart,

	// Constructor is extHostTypes.LanguageModelToolCallPart
	// type LanguageModelToolCallPart as VscodeLanguageModelToolCallPart,

	// For proposed API
	type LanguageModelIgnoredFileProvider as VscodeLanguageModelIgnoredFileProvider,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Placeholder for Full extHostTypeConverters for Language Model Types ---
// TODO: CRITICAL - Replace these stubs with actual, robust converters adapted from
// 'vs/workbench/api/common/extHostTypeConverters.ts' or equivalent implementations.
// Proper conversion is essential for handling rich message content (tool calls, data buffers)
// and other complex structures in the `vscode.lm` API.
const localApiTypeConverters = {
	LanguageModelChatMessage2: {
		fromApiType: (
			message: VscodeLanguageModelChatMessage2,
		): RpcChatMessage => {
			// STUBBED/SIMPLIFIED CONVERSION:
			// This needs to correctly handle VscodeLanguageModelTextPart, VscodeLanguageModelDataPart, VscodeLanguageModelToolCallPart
			// and map them to the corresponding DTO structures expected by RpcChatMessage (often based on internal ChatRequest*Part types).
			let rpcContent: string | RpcChatMessage["content"][0][] = "";

			if (typeof message.content === "string") {
				rpcContent = message.content;
			} else if (Array.isArray(message.content)) {
				// This mapping is highly simplified and likely incorrect for complex parts.
				rpcContent = message.content.map((part) => {
					if (part instanceof extHostTypes.LanguageModelTextPart) {
						return {
							type: "text",

							text: part.value,
						} as ChatRequestTextPart;
					} else if (
						part instanceof extHostTypes.LanguageModelToolCallPart
					) {
						console.warn(
							"[TypeConverter LM STUB] LanguageModelToolCallPart to DTO not fully implemented.",
						);

						return {
							type: "tool_code",

							tool_code: {
								/* DTO structure for tool call */ id: part.id,

								name: part.name,

								arguments: JSON.stringify(part.argumentsObject),
							},
						} as any;
					} else if (
						part instanceof extHostTypes.LanguageModelDataPart
					) {
						console.warn(
							"[TypeConverter LM STUB] LanguageModelDataPart to DTO not fully implemented.",
						);

						// Requires converting Uint8Array to VSBuffer then potentially base64 string if DTO expects that.
						return {
							type: "data",

							data: {
								mimeType: part.mimeType,

								value: VSBuffer.wrap(part.data).toString(
									"base64",
								),
							},
						} as any;
					}

					console.warn(
						"[TypeConverter LM STUB] Unknown LanguageModelChatResponsePart type during DTO conversion.",
					);

					return {
						type: "text",

						text: "[unsupported API part]",
					} as ChatRequestTextPart;
				});
			}

			return {
				// Map vscode.LanguageModelChatMessageRole to numeric role if DTO expects it (e.g., 0 for User, 1 for Assistant/System)
				role:
					message.role === VscodeLanguageModelChatMessageRole.User
						? 0
						: // Example mapping
							1,

				// Ensure RpcChatMessage.content matches this structure
				content: rpcContent as any,

				name: message.name,
			};
		},

		toApiType: (dto: RpcChatMessage): VscodeLanguageModelChatMessage2 => {
			// STUBBED/SIMPLIFIED CONVERSION:
			// Needs to map RpcChatMessage DTO (and its content parts) back to VscodeLanguageModelChatMessage2 and its API part types.
			let apiContent: string | VscodeLanguageModelChatResponsePart[] = "";

			if (typeof dto.content === "string") {
				apiContent = dto.content;
			} else if (Array.isArray(dto.content)) {
				// dto.content is likely (ChatRequestTextPart | ChatRequestToolPart | ChatRequestAgentPart)[]
				// This needs correct mapping to VscodeLanguageModelTextPart, VscodeLanguageModelToolCallPart, VscodeLanguageModelDataPart.
				apiContent = (dto.content as any[]).map((partDto: any) => {
					if (
						partDto.type === "text" &&
						typeof partDto.text === "string"
					) {
						return new extHostTypes.LanguageModelTextPart(
							partDto.text,
						);
					} else if (
						partDto.type === "tool_code" &&
						partDto.tool_code
					) {
						// Assuming this DTO structure
						console.warn(
							"[TypeConverter LM STUB] DTO tool_code part to LanguageModelToolCallPart not fully implemented.",
						);

						return new extHostTypes.LanguageModelToolCallPart(
							partDto.tool_code.id || "stub-id",

							partDto.tool_code.name || "stub-name",

							JSON.parse(partDto.tool_code.arguments || "{}"),
						);
					}

					// TODO: Handle other DTO part types (data, agent).
					console.warn(
						"[TypeConverter LM STUB] Unknown DTO content part type during API conversion:",

						partDto.type,
					);

					return new extHostTypes.LanguageModelTextPart(
						"[unsupported DTO part received]",
					);
				});
			}

			// Use constructor from extHostTypes
			return new extHostTypes.LanguageModelChatMessage(
				dto.role === 0
					? VscodeLanguageModelChatMessageRole.User
					: // Example mapping
						VscodeLanguageModelChatMessageRole.System,

				apiContent,

				dto.name,

				// Cast to ensure type compatibility
			) as VscodeLanguageModelChatMessage2;
		},
	},

	// TODO: Add converters for LanguageModelChatRequestOptions, RpcLanguageModelChatMetadata,

	// VscodeLanguageModelChatResponsePart (from RpcChatResponseFragment.part), etc.
};

// --- Internal Data Structures for Managing Providers and Requests ---

/** Stores data for a language model provider registered by an extension. */
type LanguageModelProviderData = {
	// The short ID of the model within the extension (e.g., "gpt-3.5-turbo").
	readonly languageModelId: string;

	// Identifier of the extension that contributed this provider.
	readonly extension: ExtensionIdentifier;

	// The actual provider instance supplied by the extension.
	readonly provider: VscodeChatResponseProvider;

	// Metadata provided at registration time.
	readonly metadata: VscodeChatResponseProviderMetadata;
};

/** Stores data for all language models known to the system, typically synced from MainThread (Mountain). */
interface AllLanguageModelEntry {
	// The DTO for model metadata received from MainThread.
	metadata: RpcLanguageModelChatMetadata;

	// Cache of `vscode.LanguageModelChat` API objects, keyed by the requesting extension's ID.
	// This allows different extensions to potentially get distinct API objects if access controls differ,

	// though often they might share the same underlying model representation.
	apiObjects: ExtensionIdentifierMap<VscodeLanguageModelChat>;
}

/** Manages the streaming response for a single language model request "option" (though typically one option per request). */
class LanguageModelResponseStreamShim {
	/** The `AsyncIterableSource` that emits response parts for this stream. */
	readonly stream: AsyncIterableSource<VscodeLanguageModelChatResponsePart>;

	/**
	 * Creates an instance of LanguageModelResponseStreamShim.
	 * @param optionIndex The index of this response option (corresponds to `RpcChatResponseFragment.index`).
	 * @param preassignedStream Optional: A pre-existing stream source to use (rare).
	 */
	constructor(
		readonly optionIndex: number,

		preassignedStream?: AsyncIterableSource<VscodeLanguageModelChatResponsePart>,
	) {
		this.stream =
			preassignedStream ||
			new AsyncIterableSource<VscodeLanguageModelChatResponsePart>();
	}
}

/**
 * Manages the overall streaming response for a `sendChatRequest` call.
 * A single request might theoretically have multiple response options (though typically one for most models).
 * This class provides the `VscodeLanguageModelChatResponse` API object to the extension.
 */
class LanguageModelResponseShim {
	/** The public `VscodeLanguageModelChatResponse` API object returned to the extension. */
	readonly apiObject: VscodeLanguageModelChatResponse;

	// Stores individual response streams, keyed by their option index (usually just index 0).
	private readonly _responseStreams = new Map<
		number,
		LanguageModelResponseStreamShim
	>();

	// Primary stream, typically for optionIndex 0.
	private readonly _defaultStream: LanguageModelResponseStreamShim;

	// Flag to indicate if the response is complete (resolved or rejected).
	private _isDone = false;

	constructor() {
		// Default stream for option index 0.
		this._defaultStream = new LanguageModelResponseStreamShim(0);

		// Pre-populate for the common case of index 0.
		this._responseStreams.set(0, this._defaultStream);

		// Capture `this` for use in getters.
		const that = this;

		this.apiObject = Object.freeze({
			// Ensure the public API object is immutable.
			get stream() {
				// The primary stream of response parts.
				return that._defaultStream.stream.asyncIterable;
			},

			get text() {
				// Asynchronously concatenates all text parts from the default stream.
				return AsyncIterableObject.map(
					that._defaultStream.stream.asyncIterable,

					(part) =>
						part instanceof extHostTypes.LanguageModelTextPart
							? part.value
							: undefined,

					// Filters out undefined (non-text parts) and concatenates strings.
				).coalesce();
			},

			// TODO: Implement other properties on VscodeLanguageModelChatResponse if they exist in the API,

			// e.g., `result` (for a final aggregated result object), `error` (if the request failed overall).
			// These would be populated when `this.resolve()` or `this.reject()` is called.
		});
	}

	/** Helper to get all active stream sources. */
	private *_getActiveStreamSources(): Iterable<
		AsyncIterableSource<VscodeLanguageModelChatResponsePart>
	> {
		if (this._responseStreams.size > 0) {
			for (const streamHolder of this._responseStreams.values())
				yield streamHolder.stream;
		} else {
			// This case should ideally not be reached if the constructor always sets up _defaultStream.
			yield this._defaultStream.stream;
		}
	}

	/** Handles an incoming response fragment DTO from the MainThread. */
	handleFragment(fragmentDto: RpcChatResponseFragment): void {
		// Ignore fragments if response is already marked as complete.
		if (this._isDone) return;

		let streamHolder = this._responseStreams.get(fragmentDto.index);

		if (!streamHolder) {
			// If this is a new fragment index, create a new stream for it.
			streamHolder = new LanguageModelResponseStreamShim(
				fragmentDto.index,
			);

			this._responseStreams.set(fragmentDto.index, streamHolder);
		}

		// Convert RpcChatResponseFragment.part (DTO) to a vscode.LanguageModelChatResponsePart (API type).
		// TODO: CRITICAL - This conversion needs to be robust and handle all part types correctly.
		let apiPart: VscodeLanguageModelChatResponsePart;

		// Cast to VS Code's internal part type for easier handling.
		const partDtoInternal = fragmentDto.part as IChatResponsePart;

		if (
			partDtoInternal.kind === "text" &&
			typeof partDtoInternal.content.value === "string"
		) {
			apiPart = new extHostTypes.LanguageModelTextPart(
				partDtoInternal.content.value,
			);
		} else if (partDtoInternal.kind === "toolComamén") {
			// Note: Protocol uses 'toolComamén', API uses 'tool_call'/'tool_use'.
			// This DTO structure for tool calls needs to match what MainThreadLanguageModels actually sends.
			// VS Code's internal `IChatResponseToolUsePart` has `toolName`, `toolInput`, and `id`.
			// Assuming `partDto.content` aligns with a serializable version of this.
			const toolUsePayload = partDtoInternal.content as {
				id?: string;

				name: string;

				input: string;

				// Example DTO shape
			};

			apiPart = new extHostTypes.LanguageModelToolCallPart(
				toolUsePayload.id ||
					// Ensure a unique ID.
					`tool_${Date.now()}_${Math.random().toString(36).substring(7)}`,

				toolUsePayload.name,

				// Assuming toolInput is JSON string for argumentsObject
				JSON.parse(toolUsePayload.input || "{}"),
			);
		} else if (
			partDtoInternal.kind === "dataBuffer" &&
			partDtoInternal.content.data instanceof VSBuffer
		) {
			// Assuming 'dataBuffer' from protocol maps to `LanguageModelDataPart`.
			const dataPartPayload = partDtoInternal.content as {
				mimeType: string;

				data: VSBuffer;
			};

			apiPart = new extHostTypes.LanguageModelDataPart(
				dataPartPayload.data.buffer,

				dataPartPayload.mimeType,
			);
		} else {
			console.warn(
				`[LM ResponseShim] Received unknown or unsupported chat response fragment part kind: '${partDtoInternal.kind}'. Skipping this fragment. DTO:`,

				partDtoInternal,
			);

			return;
		}

		streamHolder.stream.emitOne(apiPart);
	}

	/** Rejects all active streams with the given error, marking the response as done. */
	reject(err: Error): void {
		if (this._isDone) return;

		this._isDone = true;

		for (const streamSource of this._getActiveStreamSources()) {
			streamSource.reject(err);
		}
	}

	/** Resolves (completes) all active streams, marking the response as done. */
	resolve(): void {
		if (this._isDone) return;

		this._isDone = true;

		for (const streamSource of this._getActiveStreamSources()) {
			streamSource.resolve();
		}
	}
}

/**
 * Cocoon's implementation of `IExtHostLanguageModels`.
 * This service manages language model providers contributed by extensions, handles chat
 * requests to these models, and facilitates streaming responses, coordinating with
 * `MainThreadLanguageModels` on Mountain via RPC.
 */
export class ShimExtHostLanguageModels
	extends BaseCocoonShim
	implements ExtHostLanguageModelsShape
{
	// Implements RPC shape for calls from MainThread
	// For IExtHostLanguageModels DI registration.
	public readonly _serviceBrand: undefined;

	// Static counter for generating unique provider handles.
	private static _providerHandlePool = 1;

	// RPC proxy to MainThread.
	readonly #mainThreadLmProxy: MainThreadLanguageModelsShape | null = null;

	// Event emitter for vscode.lm.onDidChangeProviders (if this API exists publicly).
	readonly #onDidChangeProvidersEmitter = new VscodeEmitter<void>();

	public readonly onDidChangeProviders: VscodeEvent<void> =
		this.#onDidChangeProvidersEmitter.event;

	// Stores locally registered providers, keyed by their handle.
	readonly #localProviders = new Map<number, LanguageModelProviderData>();

	// Stores metadata for all language models known to the system (synced from MainThread), keyed by fullModelId.
	readonly #allLanguageModelsData = new Map<string, AllLanguageModelEntry>();

	// Tracks access grants: Map<requestingExtId (string), Set<providingExtId (string)>>.
	readonly #modelAccessList =
		new ExtensionIdentifierMap<ExtensionIdentifierSet>();

	// Tracks extensions that have created LanguageModelAccessInformation objects, for onDidChange updates.
	readonly #languageAccessInformationRequestingExtensions = new Set<
		Readonly<IExtensionDescription>
	>();

	// Internal event emitter for changes in model access grants.
	readonly #onDidChangeModelAccessEmitter = new VscodeEmitter<{
		from: ExtensionIdentifier;

		to: ExtensionIdentifier;
	}>();

	// Stores pending chat requests, keyed by a unique requestId.
	readonly #pendingChatRequests = new Map<
		number,
		{ languageModelId: string; responseStream: LanguageModelResponseShim }
	>();

	// Counter for unique chat request IDs.
	#chatRequestIdPool = 0;

	// Stores registered LanguageModelIgnoredFileProvider instances (proposed API).
	readonly #ignoredFileProviders = new Map<
		number,
		VscodeLanguageModelIgnoredFileProvider
	>();

	/**
	 * Creates an instance of ShimExtHostLanguageModels.
	 * @param rpcService The RPC service adapter for communication with Mountain.
	 * @param logService The logging service instance.
	 * @param _extHostAuthentication Optional: The ExtHostAuthentication service, for future integration with real auth flows.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		// Optional for auth logic
		private readonly _extHostAuthentication?: IExtHostAuthentication,
	) {
		super("ExtHostLanguageModels", rpcService, logService);

		// Use Info for major lifecycle events.
		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadLmProxy = this._getProxy(
				MainContext.MainThreadLanguageModels as ProxyIdentifier<MainThreadLanguageModelsShape>,
			);

			try {
				// VS Code uses `ExtHostContext.ExtHostChatProvider` as the DI key/context ID for this service.
				this._rpcService.set(
					ExtHostContext.ExtHostChatProvider as ProxyIdentifier<ExtHostLanguageModelsShape>,

					this,
				);

				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostContext.ExtHostChatProvider for Language Models).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostChatProvider (Language Models):",

					e,
				);
			}
		}

		if (!this.#mainThreadLmProxy) {
			this._logWarn(
				"MainThreadLanguageModels RPC proxy is not available. Most Language Model features " +
					"(provider registration with MainThread, model selection, chat requests to remote models, token counting for remote models) " +
					"will be non-functional or severely impaired.",
			);
		}

		// Listen to internal access change events to update relevant LanguageModelAccessInformation instances.
		this._instanceDisposables.add(
			this.#onDidChangeModelAccessEmitter.event((e) => {
				this.#languageAccessInformationRequestingExtensions.forEach(
					(extDesc) => {
						if (
							ExtensionIdentifier.equals(
								e.from,

								extDesc.identifier,
							)
						) {
							// TODO: If LanguageModelAccessInformation instances had their own onDidChange emitters,

							// they would be fired here to signal a potential change in their `accessAllowed` property.
							// For now, VscodeLanguageModelAccessInformation.onDidChange is VscodeEvent.None.
							this._logDebug(
								`Model access changed for requesting extension '${e.from.value}' regarding models from '${e.to.value}'. Relevant LMAI instances should ideally update.`,
							);
						}
					},
				);
			}),
		);
	}

	// --- vscode.lm.* API implementation (methods called by extensions via vscode.lm namespace) ---

	/**
	 * {@inheritDoc vscode.lm.registerChatResponseProvider} (Conceptual location)
	 * Registers a chat response provider contributed by an extension.
	 * @param extension The `IExtensionDescription` of the extension contributing the provider.
	 * @param identifier A unique identifier for the language model within the scope of the extension (e.g., "gpt-3.5-turbo").
	 * @param provider The `VscodeChatResponseProvider` implementation from the extension.
	 * @param metadata Metadata about the language model being provided.
	 * @returns An `IDisposable` that, when disposed, will unregister the provider.
	 */
	public registerChatResponseProvider(
		extension: IExtensionDescription,

		identifier: string,

		provider: VscodeChatResponseProvider,

		metadata: VscodeChatResponseProviderMetadata,
	): IDisposable {
		const handle = ShimExtHostLanguageModels._providerHandlePool++;

		// Construct a globally unique model ID: "extension.identifier/model.identifier"
		const fullModelId = `${extension.identifier.value}/${identifier}`;

		this._logInfo(
			`Registering ChatResponseProvider: Handle=${handle}, FullID='${fullModelId}', Name='${metadata.name || identifier}' from Ext='${extension.identifier.value}'.`,
		);

		this.#localProviders.set(handle, {
			extension: extension.identifier,

			provider,

			languageModelId: identifier,

			metadata,
		});

		// Convert VscodeChatResponseProviderMetadata (public API type) to RpcLanguageModelChatMetadata (protocol DTO).
		const rpcMetadata: RpcLanguageModelChatMetadata = {
			// The contributing extension's identifier.
			extension: extension.identifier,

			// The model's short ID within that extension.
			id: identifier,

			vendor:
				metadata.vendor ??
				extension.publisher ??
				// Default vendor to publisher or ext ID.
				extension.identifier.value,

			// Default display name to the model's short ID.
			name: metadata.name ?? identifier,

			version: metadata.version,

			family: metadata.family,

			maxInputTokens: metadata.maxInputTokens,

			// Note: VscodeChatResponseProviderMetadata might not have maxOutputTokens directly.
			maxOutputTokens: metadata.maxOutputTokens,

			auth: metadata.auth
				? {
						// Convert auth metadata if present.
						providerLabel:
							typeof metadata.auth === "object"
								? metadata.auth.providerLabel
								: extension.displayName || extension.name,

						accountLabel:
							typeof metadata.auth === "object"
								? metadata.auth.accountLabel
								: undefined,
					}
				: undefined,

			targetExtensions: metadata.extensions?.map(
				(extIdStr) => new ExtensionIdentifier(extIdStr),

				// Convert string IDs to ExtensionIdentifier.
			),

			// Whether this model is a default for its kind.
			isDefault: metadata.isDefault,

			// Default to true if not specified.
			isUserSelectable: metadata.isUserSelectable !== false,

			modelPickerCategory:
				// Default category if not specified.
				metadata.category || DEFAULT_MODEL_PICKER_CATEGORY,

			capabilities: metadata.capabilities
				? {
						// Convert capabilities flags.
						vision: !!metadata.capabilities.vision,

						toolCalling: !!metadata.capabilities.toolCalling,

						// Support for multi-turn, tool-augmented chains.
						chaining: !!metadata.capabilities.chaining,
					}
				: undefined,
		};

		this.#mainThreadLmProxy
			?.$registerLanguageModelProvider(handle, fullModelId, rpcMetadata)
			.catch((e) =>
				this._logError(
					`RPC call $registerLanguageModelProvider for '${fullModelId}' (Handle ${handle}) failed:`,

					refineErrorForShim(
						e,

						this._logService,

						"$registerLanguageModelProvider RPC",
					),
				),
			);

		// If the provider has an `onDidReceiveLanguageModelResponse2` event, subscribe to it
		// to notify the MainThread about token usage, etc.
		const responseListener = provider.onDidReceiveLanguageModelResponse2?.(
			({ extensionId, participant, tokenCount }) => {
				this.#mainThreadLmProxy?.$whenLanguageModelChatRequestMade(
					fullModelId,

					// Requesting extension's ID.
					new ExtensionIdentifier(extensionId),

					// Participant that was invoked (e.g., agent, tool).
					participant,

					// Token count for the interaction.
					tokenCount,
				);
			},
		);

		if (responseListener) {
			// Manage subscription.
			this._instanceDisposables.add(responseListener);
		}

		return toDisposable(() => {
			this._logInfo(
				`Unregistering ChatResponseProvider: Handle=${handle}, FullID='${fullModelId}' from Ext='${extension.identifier.value}'.`,
			);

			this.#localProviders.delete(handle);

			this.#mainThreadLmProxy?.$unregisterProvider(handle).catch((e) =>
				this._logError(
					`RPC call $unregisterProvider for Handle ${handle} failed:`,

					refineErrorForShim(
						e,

						this._logService,

						"$unregisterProvider RPC",
					),
				),
			);

			if (responseListener) {
				// Dispose the event listener.
				responseListener.dispose();
			}
		});
	}

	/**
	 * {@inheritDoc vscode.lm.selectLanguageModels} (Conceptual location)
	 * Allows an extension to query for available language models based on specified criteria.
	 * @param extension The `IExtensionDescription` of the extension making the selection request.
	 * @param selector Criteria (`VscodeLanguageModelChatSelector`) for selecting models (e.g., by vendor, family, capabilities).
	 * @returns A promise resolving to an array of `vscode.LanguageModelChat` API objects that match the selector.
	 */
	public async selectLanguageModels(
		extension: IExtensionDescription,

		selector: VscodeLanguageModelChatSelector,
	): Promise<VscodeLanguageModelChat[]> {
		this._logInfo(
			`API selectLanguageModels called by Ext='${extension.identifier.value}', Selector=${JSON.stringify(selector)}`,
		);

		if (!this.#mainThreadLmProxy) {
			this._logError(
				"Cannot selectLanguageModels: MainThreadLanguageModels RPC proxy is unavailable. Returning empty array.",
			);

			return [];
		}

		try {
			// The VscodeLanguageModelChatSelector (API type) needs to be compatible with the
			// protocol.ILanguageModelChatSelector DTO expected by `$selectChatModels`.
			// Assuming direct compatibility or that any necessary conversion happens here or in the RPC layer.
			const selectedModelIdsFromMain =
				await this.#mainThreadLmProxy.$selectChatModels({
					// Spread selector properties (vendor, family, name, id, version, capabilities).
					...selector,

					// Add the requesting extension's ID to the DTO.
					extension: extension.identifier,
				});

			const result: VscodeLanguageModelChat[] = [];

			for (const fullModelId of selectedModelIdsFromMain) {
				// `fullModelId` here is the globally unique ID, e.g., "publisher.name/modelShortId".
				const modelApiObject = this._createApiObjectForModel(
					extension,

					fullModelId,
				);

				if (modelApiObject) {
					result.push(modelApiObject);
				} else {
					this._logWarn(
						`Could not create API object for selected model ID '${fullModelId}' during selectLanguageModels for ext '${extension.identifier.value}'. Model metadata might be missing.`,
					);
				}
			}

			this._logDebug(
				`selectLanguageModels for ext '${extension.identifier.value}' resolved to ${result.length} models.`,
			);

			return result;
		} catch (e: any) {
			this._logError(
				"RPC call $selectChatModels failed:",

				refineErrorForShim(
					e,

					this._logService,

					"$selectChatModels RPC",
				),
			);

			// Return empty array on RPC error.
			return [];
		}
	}

	/**
	 * Sends a chat request to a specified language model. This is the internal implementation
	 * backing the `VscodeLanguageModelChat.sendRequest` API method.
	 * @param requestingExtension The `IExtensionDescription` of the extension initiating the request.
	 * @param modelId The full identifier of the target language model (e.g., "publisher.name/modelShortId").
	 * @param requestMessages An array of `VscodeLanguageModelChatMessage2` objects forming the request.
	 * @param options Additional `VscodeLanguageModelChatRequestOptions` for the request.
	 * @param token A `VscodeCancellationToken` for the request.
	 * @returns A promise resolving to a `VscodeLanguageModelChatResponse` object, which includes the streaming response.
	 * @throws A `VscodeLanguageModelError` if the model is not found, access is denied, or other errors occur.
	 */
	public async sendChatRequest(
		requestingExtension: IExtensionDescription,

		modelId: string,

		requestMessages: VscodeLanguageModelChatMessage2[],

		options: VscodeLanguageModelChatRequestOptions,

		token: VscodeCancellationToken,
	): Promise<VscodeLanguageModelChatResponse> {
		this._logDebug(
			`API sendChatRequest from Ext='${requestingExtension.identifier.value}' to Model='${modelId}', Messages=${requestMessages.length}, Options=${JSON.stringify(options)}`,
		);

		const modelDataEntry = this.#allLanguageModelsData.get(modelId);

		if (!modelDataEntry) {
			this._logWarn(
				`Attempted to send chat request to unknown or unavailable model ID: '${modelId}' by ext '${requestingExtension.identifier.value}'.`,
			);

			throw VscodeLanguageModelError.NotFound(
				`Language model '${modelId}' is unknown or not available.`,
			);
		}

		// Simplified Access/Authentication Check (based on VS Code's _getAuthAccess logic).
		// This checks if the model requires auth and if the requesting extension has been granted access.
		if (
			this._isAuthNeeded(
				requestingExtension.identifier,

				modelDataEntry.metadata,
			)
		) {
			const accessGranted = this.#modelAccessList
				.get(requestingExtension.identifier)
				?.has(modelDataEntry.metadata.extension);

			if (!accessGranted) {
				// TODO: A full implementation would trigger an auth flow here using `this._extHostAuthentication.getSession(...)`
				// for the provider `modelDataEntry.metadata.extension` and then update `#modelAccessList` upon success.
				// For MVP, if access is not already in the list, it's denied.
				this._logWarn(
					`Authentication/Access Denied (MVP Stub): Extension '${requestingExtension.identifier.value}' attempted to use model '${modelId}' ` +
						`(provided by '${modelDataEntry.metadata.extension.value}') but lacks prior grant. Full auth flow not implemented.`,
				);

				throw VscodeLanguageModelError.NoPermissions(
					`Access to language model '${modelId}' denied for extension '${requestingExtension.identifier.value}'. ` +
						`Authentication or an explicit access grant may be required.`,
				);
			}
		}

		// Generate a unique ID for this request.
		const requestId = ++this.#chatRequestIdPool;

		// Create a handler for the streaming response.
		const responseShim = new LanguageModelResponseShim();

		this.#pendingChatRequests.set(requestId, {
			languageModelId: modelId,

			responseStream: responseShim,
		});

		// TODO: CRITICAL - Convert VscodeLanguageModelChatMessage2[] to RpcChatMessage[] DTOs.
		// `localApiTypeConverters.LanguageModelChatMessage2.fromApiType` is a STUB and needs full implementation.
		const rpcMessages: RpcChatMessage[] = requestMessages.map((m) =>
			localApiTypeConverters.LanguageModelChatMessage2.fromApiType(m),
		);

		// Wrap if messages contain VSBuffers (e.g., from LanguageModelDataPart).
		const messagesPayload = this._wrapIfContainsBuffer(rpcMessages);

		if (token.isCancellationRequested) {
			// Check token before making the potentially long RPC call.
			this._logDebug(
				`Chat request (ID ${requestId}) for model '${modelId}' cancelled by token before RPC call.`,
			);

			this.#pendingChatRequests.delete(requestId);

			responseShim.reject(new CancellationError());

			return responseShim.apiObject;
		}

		const cancellationListener = token.onCancellationRequested(() => {
			// Handle cancellation during the request.
			const pendingRequest = this.#pendingChatRequests.get(requestId);

			if (pendingRequest) {
				this._logInfo(
					`Chat request (ID ${requestId}) for model '${modelId}' cancelled by token during execution.`,
				);

				pendingRequest.responseStream.reject(new CancellationError());

				this.#pendingChatRequests.delete(requestId);

				// Notify MainThread of the cancellation if the protocol supports it.
				this.#mainThreadLmProxy
					?.$cancelChatRequest(requestId)
					.catch((e) =>
						this._logWarn(
							`Failed to send $cancelChatRequest to MainThread for request ID ${requestId}:`,

							e,
						),
					);
			}
		});

		// Ensure the cancellation listener is disposed when the request completes or is rejected by other means.
		const ensureListenerDisposed = () => cancellationListener.dispose();

		if (!this.#mainThreadLmProxy) {
			this._logError(
				`Cannot send chat request for model '${modelId}': MainThreadLanguageModels RPC proxy is unavailable.`,
			);

			responseShim.reject(
				VscodeLanguageModelError.Internal(
					"Language model service is unavailable.",
				),
			);

			this.#pendingChatRequests.delete(requestId);

			ensureListenerDisposed();

			// Return the response object, which will be in a rejected state.
			return responseShim.apiObject;
		}

		this.#mainThreadLmProxy
			.$tryStartChatRequest(
				requestingExtension.identifier,

				modelId,

				requestId,

				messagesPayload,

				// Assuming VscodeLanguageModelChatRequestOptions is compatible with the protocol DTO.
				options,

				// Explicit CancellationToken ID is not passed for MVP; cancellation is handled ExtHost-side.
				undefined,
			)
			.then(ensureListenerDisposed, (rpcError) => {
				// Handle promise rejection from the $tryStartChatRequest RPC call itself.
				const pendingRequest = this.#pendingChatRequests.get(requestId);

				if (pendingRequest) {
					// Error might be a SerializedError from RPC, try to deserialize it.
					const deserializedError =
						VscodeLanguageModelError.tryDeserialize(rpcError) ??
						transformErrorFromSerialization(rpcError);

					this._logError(
						`RPC call $tryStartChatRequest for model '${modelId}' (Req ID ${requestId}) failed:`,

						deserializedError,
					);

					pendingRequest.responseStream.reject(deserializedError);

					this.#pendingChatRequests.delete(requestId);
				} else {
					// This case (request not in pending map but RPC error received) should be rare.
					this._logError(
						`Received RPC error for $tryStartChatRequest (model '${modelId}', Req ID ${requestId}) but no matching pending request found. Error:`,

						rpcError,
					);
				}

				ensureListenerDisposed();
			});

		// Return the API object that provides the stream.
		return responseShim.apiObject;
	}

	/** Helper to wrap data in `SerializableObjectWithBuffers` if it contains `VSBuffer` instances. */
	private _wrapIfContainsBuffer<T>(
		data: T,
	): T | SerializableObjectWithBuffers<T> {
		let containsBuffer = false;

		const checkItemForBuffer = (item: any): boolean => {
			if (VSBuffer.isVSBuffer(item)) return true;

			if (typeof item === "object" && item !== null) {
				// Check properties of objects, or elements if item is an array (though top-level array is handled separately)
				return Object.values(item).some(checkItemForBuffer);
			}

			return false;
		};

		if (Array.isArray(data)) {
			containsBuffer = data.some(checkItemForBuffer);
		} else if (typeof data === "object" && data !== null) {
			containsBuffer = Object.values(data).some(checkItemForBuffer);
		}

		return containsBuffer ? new SerializableObjectWithBuffers(data) : data;
	}

	/** Creates or retrieves a cached `vscode.LanguageModelChat` API object for a specific model ID and requesting extension. */
	private _createApiObjectForModel(
		requestingExtension: IExtensionDescription,

		modelId: string,
	): VscodeLanguageModelChat | undefined {
		const modelEntry = this.#allLanguageModelsData.get(modelId);

		if (!modelEntry) {
			this._logWarn(
				`_createApiObjectForModel: No metadata found for model ID '${modelId}' (requested by ext '${requestingExtension.identifier.value}'). Cannot create API object.`,
			);

			return undefined;
		}

		let apiObject = modelEntry.apiObjects.get(
			requestingExtension.identifier,
		);

		if (!apiObject) {
			// This is RpcLanguageModelChatMetadata
			const metadataFromRpc = modelEntry.metadata;

			// Capture `this` for use in closures.
			const self = this;

			apiObject = Object.freeze({
				// Ensure the public API object is immutable.
				// This is the full model ID (e.g., "publisher.name/modelShortId")
				id: metadataFromRpc.id,

				vendor: metadataFromRpc.vendor,

				name: metadataFromRpc.name,

				family: metadataFromRpc.family,

				version: metadataFromRpc.version,

				maxInputTokens: metadataFromRpc.maxInputTokens,

				// `maxOutputTokens` might be on RpcLanguageModelChatMetadata or VscodeChatResponseProviderMetadata.
				// If it's part of RpcLanguageModelChatMetadata, it can be exposed here.
				// For now, assuming it's primarily on the provider's metadata.
				get capabilities() {
					// Use a getter for capabilities if they could theoretically change dynamically.
					return Object.freeze({
						// Map from RpcLanguageModelChatMetadata.capabilities DTO.
						vision: !!metadataFromRpc.capabilities?.vision,

						toolCalling:
							!!metadataFromRpc.capabilities?.toolCalling,

						chaining: !!metadataFromRpc.capabilities?.chaining,
					});
				},

				countTokens: (
					textOrMessages:
						| string
						| VscodeLanguageModelChatMessage2
						| VscodeLanguageModelChatMessage2[],

					// Default to non-cancellable token
					token: VscodeCancellationToken = CancellationToken.None,
				): Promise<number> => {
					return self._countTokensForModel(
						modelId,

						textOrMessages,

						token,
					);
				},

				sendRequest: (
					messages: VscodeLanguageModelChatMessage2[],

					options?: VscodeLanguageModelChatRequestOptions,

					// Default token
					token: VscodeCancellationToken = CancellationToken.None,
				): Promise<VscodeLanguageModelChatResponse> => {
					return self.sendChatRequest(
						requestingExtension,

						modelId,

						messages,

						options || {},

						token,
					);
				},
			});

			modelEntry.apiObjects.set(
				requestingExtension.identifier,

				apiObject,
			);
		}

		return apiObject;
	}

	/** Helper to count tokens, either by calling a local provider or proxying to MainThread via RPC. */
	private async _countTokensForModel(
		// Full model ID (e.g., "publisher.name/modelShortId")
		modelId: string,

		textOrMessages:
			| string
			| VscodeLanguageModelChatMessage2
			| VscodeLanguageModelChatMessage2[],

		token: VscodeCancellationToken,
	): Promise<number> {
		this._logDebug(`_countTokensForModel called for Model='${modelId}'`);

		// Check if the provider for this modelId is registered locally in this ExtHost.
		const localProviderData = Iterable.find(
			this.#localProviders.values(),

			(p) => `${p.extension.value}/${p.languageModelId}` === modelId,
		);

		if (localProviderData?.provider.provideTokenCount) {
			// If local provider exists and implements provideTokenCount
			try {
				// The provider's `provideTokenCount` method expects API types (string or VscodeLanguageModelChatMessage2).
				// `VscodeLanguageModelChatMessage2`'s content can be a string or an array of rich parts.
				// The current signature of `provideTokenCount` in `vscode.d.ts` is:
				// `provideTokenCount(value: string | LanguageModelChatMessage, token: CancellationToken): ProviderResult<number>;`
				// We need to ensure `textOrMessages` is correctly passed based on this signature.
				let inputForProvider: string | VscodeLanguageModelChatMessage2;

				if (typeof textOrMessages === "string") {
					inputForProvider = textOrMessages;
				} else if (Array.isArray(textOrMessages)) {
					// If `textOrMessages` is an array of messages, the `vscode.lm.countTokens` API implies
					// counting tokens for the whole array. However, a provider's `provideTokenCount` typically
					// takes a single message or string. This might require clarification or a strategy like
					// serializing the array into a single string if the provider doesn't handle arrays directly.
					// For this shim, if an array is passed, we'll log a warning and attempt to count the first message,

					// or ideally, this should be an error or require specific handling by the provider contract.
					this._logWarnOnce(
						`_countTokensForModel: Received an array of messages for token counting with local provider for model '${modelId}'. ` +
							`The provider's \`provideTokenCount\` typically expects a single string or message. ` +
							`Attempting to count tokens for the first message only. Ensure the provider contract handles this.`,
					);

					// No messages, no tokens.
					if (textOrMessages.length === 0) return 0;

					inputForProvider = textOrMessages[0];
				} else {
					// It's a single VscodeLanguageModelChatMessage2 object
					inputForProvider = textOrMessages;
				}

				return await Promise.resolve(
					localProviderData.provider.provideTokenCount(
						inputForProvider,

						token,
					),
				);
			} catch (e: any) {
				this._logError(
					`Error in local provider's provideTokenCount method for model '${modelId}':`,

					e,
				);

				throw VscodeLanguageModelError.Internal(
					"Token counting failed due to an error in the local language model provider.",
				);
			}
		}

		// If not handled locally (no local provider or no `provideTokenCount` method), proxy to main thread.
		if (!this.#mainThreadLmProxy) {
			this._logError(
				`Cannot count tokens for model '${modelId}': MainThreadLanguageModels RPC proxy is unavailable.`,
			);

			throw VscodeLanguageModelError.Internal(
				"Language model service (MainThread proxy) is unavailable for token counting operation.",
			);
		}

		// Convert input to DTO for RPC. The `$countTokens` RPC method likely expects a string or a single RpcChatMessage DTO.
		// TODO: CRITICAL - This conversion relies on `localApiTypeConverters`, which is currently a stub.
		const rpcValueForCount =
			typeof textOrMessages === "string"
				? textOrMessages
				: localApiTypeConverters.LanguageModelChatMessage2.fromApiType(
						// If `textOrMessages` is an array, send the first message for DTO conversion, similar to local provider logic.
						Array.isArray(textOrMessages)
							? textOrMessages[0]
							: textOrMessages,
					);

		return this.#mainThreadLmProxy.$countTokens(
			modelId,

			rpcValueForCount,

			token,
		);
	}

	// --- createLanguageModelAccessInformation (Called by ExtHostExtensionService for ExtensionContext) ---
	/**
	 * Creates a `VscodeLanguageModelAccessInformation` object for a given extension.
	 * This object allows the extension to check its general access status to language models
	 * that might require authentication or specific grants.
	 * @param requestingExtension The `IExtensionDescription` of the extension for which to create this access information.
	 * @returns A `VscodeLanguageModelAccessInformation` object.
	 */
	public createLanguageModelAccessInformation(
		requestingExtension: IExtensionDescription,
	): VscodeLanguageModelAccessInformation {
		this._logDebug(
			`Creating LanguageModelAccessInformation for extension: '${requestingExtension.identifier.value}'`,
		);

		this.#languageAccessInformationRequestingExtensions.add(
			requestingExtension,

			// Track for potential onDidChange updates.
		);

		// Capture `this` for use in the getter.
		const self = this;

		return Object.freeze({
			// Ensure the API object is immutable.
			get accessAllowed(): boolean {
				// This getter provides a simplified view: is this extension allowed to access *any* model that requires auth?
				// A more granular check (`canSendRequest(modelId)`) would be on the `VscodeLanguageModelChat` object.
				// Here, `accessAllowed` is true if:
				//   a) No models known to the system require auth from this extension.
				//   b) For every model that *does* require auth from this extension, a grant exists in `#modelAccessList`.
				for (const modelEntry of self.#allLanguageModelsData.values()) {
					if (
						self._isAuthNeeded(
							requestingExtension.identifier,

							modelEntry.metadata,
						)
					) {
						// This model requires auth, and the requesting extension is not the provider.
						// Check if an access grant exists from `requestingExtension` to `modelEntry.metadata.extension`.
						if (
							!self.#modelAccessList
								.get(requestingExtension.identifier)
								?.has(modelEntry.metadata.extension)
						) {
							// No grant found for at least one model that requires it.
							this._logDebug(
								`LMAI.accessAllowed is false for ext '${requestingExtension.identifier.value}' due to missing grant for model '${modelEntry.metadata.id}' (from ext '${modelEntry.metadata.extension.value}').`,
							);

							return false;
						}
					}
				}

				// If loop completes, access is granted for all relevant models, or no models require specific auth from this ext.
				this._logDebug(
					`LMAI.accessAllowed is true for ext '${requestingExtension.identifier.value}'.`,
				);

				return true;
			},

			// TODO: The `onDidChange` event for `LanguageModelAccessInformation` should fire when the result of
			// its `accessAllowed` getter might change *for this specific `requestingExtension`*.
			// This would require LanguageModelAccessInformation instances to have their own private emitters
			// that subscribe to `this.#onDidChangeModelAccessEmitter` and filter events relevant to them.
			// For MVP, this is a No-Operation event.
			onDidChange: VscodeEvent.None,
		});
	}

	// --- RPC methods called BY MainThread (Mountain) - Implementation of ExtHostLanguageModelsShape ---

	/** {@inheritDoc ExtHostLanguageModelsShape.$acceptChatModelMetadata} */
	public $acceptChatModelMetadata(data: RpcLanguageModelsChangeEvent): void {
		this._logDebug(
			`RPC $acceptChatModelMetadata received: Added=${data.added?.length ?? 0} models, Removed=${data.removed?.length ?? 0} models.`,
		);

		// Flag to track if any actual change occurred that warrants firing onDidChangeProviders.
		let changed = false;

		if (data.added) {
			for (const {
				identifier: fullModelId,

				metadata: rpcMetadata,
			} of data.added) {
				// Add or update the model entry.
				if (
					!this.#allLanguageModelsData.has(fullModelId) ||
					JSON.stringify(
						this.#allLanguageModelsData.get(fullModelId)?.metadata,

						// Basic check for metadata change
					) !== JSON.stringify(rpcMetadata)
				) {
					this.#allLanguageModelsData.set(fullModelId, {
						metadata: rpcMetadata,

						// Initialize cache for API objects for this model
						apiObjects: new ExtensionIdentifierMap(),
					});

					changed = true;

					this._logInfo(
						`Accepted/Updated metadata for language model '${fullModelId}'.`,
					);
				}

				// VS Code's original ExtHostLanguageModels does this:
				// `data.added?.forEach(added => this._fakeAuthPopulate(added.metadata));`
				// This `_fakeAuthPopulate` attempts to silently pre-establish auth sessions if needed.
				// For Cocoon's MVP, this advanced silent auth pre-population is skipped.
			}
		}

		if (data.removed) {
			for (const fullModelId of data.removed) {
				if (this.#allLanguageModelsData.delete(fullModelId)) {
					changed = true;

					this._logInfo(
						`Removed metadata for language model '${fullModelId}'.`,
					);
				}

				// Cancel any pending chat requests that were targeting a now-removed model.
				for (const [requestId, pendingRequest] of this
					.#pendingChatRequests) {
					if (pendingRequest.languageModelId === fullModelId) {
						this._logWarn(
							`Language model '${fullModelId}' was removed. Rejecting pending chat request ID ${requestId}.`,
						);

						pendingRequest.responseStream.reject(
							VscodeLanguageModelError.NotFound(
								`Language model '${fullModelId}' was removed or became unavailable.`,
							),
						);

						this.#pendingChatRequests.delete(requestId);
					}
				}
			}
		}

		if (changed) {
			// If any models were actually added, removed, or updated.
			// Notify listeners that the set of available providers might have changed.
			this.#onDidChangeProvidersEmitter.fire();
		}
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$updateModelAccesslist} */
	public $updateModelAccesslist(
		entries: {
			from: ExtensionIdentifier;

			to: ExtensionIdentifier;

			enabled: boolean;
		}[],
	): void {
		this._logDebug(
			`RPC $updateModelAccesslist received with ${entries.length} entries.`,
		);

		for (const {
			from: requestingExtensionId,

			to: providingExtensionId,

			enabled: accessGranted,
		} of entries) {
			let accessSet = this.#modelAccessList.get(requestingExtensionId);

			if (!accessSet) {
				// No need to create set just to reflect a non-grant.
				if (!accessGranted) continue;

				accessSet = new ExtensionIdentifierSet();

				this.#modelAccessList.set(requestingExtensionId, accessSet);
			}

			let changed: boolean;

			if (accessGranted) {
				// `add` returns true if value was newly added.
				changed = accessSet.add(providingExtensionId);
			} else {
				// `delete` returns true if value was present and removed.
				changed = accessSet.delete(providingExtensionId);
			}

			if (changed) {
				// If the access status actually changed for this pair.
				this._logInfo(
					`Model access grant from '${requestingExtensionId.value}' to models by '${providingExtensionId.value}' set to: ${accessGranted}.`,
				);

				this.#onDidChangeModelAccessEmitter.fire({
					from: requestingExtensionId,

					to: providingExtensionId,

					// Fire internal event.
				});
			}
		}
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$provideLanguageModelResponse} */
	public async $provideLanguageModelResponse(
		// This seems to be `chatHandle` in VS Code, often 0 for non-interactive
		_chatRequestCrossBoundaryId_unused: number,

		// The ExtHost-generated ID for the chat request
		requestId: number,

		// The DTO for the response fragment
		responseDto: RpcChatResponseFragment,

		// True if this is the final fragment for this response option
		isLast: boolean,
	): Promise<void> {
		this._logDebug(
			`RPC $provideLanguageModelResponse for RequestID ${requestId}, OptionIndex ${responseDto.index}, IsLastChunk: ${isLast}`,
		);

		const pendingRequest = this.#pendingChatRequests.get(requestId);

		if (pendingRequest) {
			try {
				// Pass DTO to the response shim.
				pendingRequest.responseStream.handleFragment(responseDto);

				if (isLast) {
					// If this is the last fragment for this response option's stream.
					// Resolve the stream.
					pendingRequest.responseStream.resolve();

					// Note: A single `sendChatRequest` might have multiple response options, though rare.
					// We only delete from `pendingChatRequests` when ALL options are done or an error occurs.
					// However, current `LanguageModelResponseShim` assumes one primary stream. If `isLast` truly means
					// the entire request is done (not just one option if multiple were supported by protocol), then delete here.
					// For simplicity, if `isLast` is true for option 0 (default), we consider the request done.
					if (responseDto.index === 0) {
						// Assuming index 0 is the primary/only stream.
						this.#pendingChatRequests.delete(requestId);

						this._logDebug(
							`Chat request ID ${requestId} (model '${pendingRequest.languageModelId}') completed and removed from pending.`,
						);
					}
				}
			} catch (e: any) {
				this._logError(
					`Error handling response fragment for RequestID ${requestId} (model '${pendingRequest.languageModelId}'):`,

					e,
				);

				pendingRequest.responseStream.reject(
					new Error(
						`Failed to process response fragment from MainThread: ${e.message || String(e)}`,
					),
				);

				// Remove on error.
				this.#pendingChatRequests.delete(requestId);
			}
		} else {
			this._logWarn(
				`Received response fragment for unknown or already completed/cancelled RequestID: ${requestId}. Ignoring fragment.`,
			);
		}
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$provideTokenLength} */
	public async $provideTokenLength(
		// Handle of the locally registered provider.
		handle: number,

		// Value to count tokens for (string or DTO).
		valueOrMessageDto: string | RpcChatMessage,

		// Cancellation token for the operation.
		token: CancellationToken,
	): Promise<number> {
		const providerData = this.#localProviders.get(handle);

		if (!providerData?.provider.provideTokenCount) {
			this._logError(
				`RPC $provideTokenLength: No local provider found for Handle ${handle}, or provider does not implement 'provideTokenCount'. ` +
					`Cannot fulfill token count request from MainThread for model '${providerData?.extension.value}/${providerData?.languageModelId}'.`,
			);

			throw new Error(
				"Provider does not support token counting or was not found for the given handle.",
			);
		}

		// TODO: CRITICAL - Convert RpcChatMessage DTO back to vscode.LanguageModelChatMessage2 API type.
		// `localApiTypeConverters.LanguageModelChatMessage2.toApiType` is a STUB.
		let apiValue: string | VscodeLanguageModelChatMessage2 =
			typeof valueOrMessageDto === "string"
				? valueOrMessageDto
				: localApiTypeConverters.LanguageModelChatMessage2.toApiType(
						valueOrMessageDto,
					);

		this._logDebug(
			`RPC $provideTokenLength: Invoking local provider (Handle ${handle}, Model '${providerData.extension.value}/${providerData.languageModelId}') to count tokens.`,
		);

		try {
			return await Promise.resolve(
				providerData.provider.provideTokenCount(apiValue, token),
			);
		} catch (error: any) {
			this._logError(
				`Error in local provider's provideTokenCount (Handle ${handle}, Model '${providerData.extension.value}/${providerData.languageModelId}') when called by MainThread:`,

				error,
			);

			// Rethrow as a generic error or a specific LanguageModelError.
			throw VscodeLanguageModelError.Internal(
				"Token counting by local provider failed during RPC invocation.",
			);
		}
	}

	// --- Authentication Helper (Simplified from VS Code's ExtHostLanguageModels) ---
	/**
	 * Simplified check to determine if authentication might be needed for a `requestingExtensionId`
	 * to use a model provided by `modelOwnerMetadata.extension`.
	 * @param requestingExtensionId Identifier of the extension making the request.
	 * @param modelOwnerMetadata Metadata of the language model being accessed.
	 * @returns `true` if the model declares auth requirements and is not provided by the same extension
	 *          or an internal auth provider; `false` otherwise.
	 */
	private _isAuthNeeded(
		requestingExtensionId: ExtensionIdentifier,

		modelOwnerMetadata: RpcLanguageModelChatMetadata,
	): modelOwnerMetadata is RpcLanguageModelChatMetadata & {
		auth: NonNullable<RpcLanguageModelChatMetadata["auth"]>;
	} {
		return (
			// True if the model itself declares it might need authentication.
			!!modelOwnerMetadata.auth &&
			!ExtensionIdentifier.equals(
				modelOwnerMetadata.extension,

				requestingExtensionId,

				// True if the requesting extension is different from the providing extension.
			) &&
			!modelOwnerMetadata.extension.value.startsWith(
				INTERNAL_AUTH_PROVIDER_PREFIX,

				// True if the providing extension is not an internal auth provider (like 'github-auth').
			)
		);
	}

	// Note: Full authentication flow (`_fakeAuthPopulate` and `_getAuthAccess` from VS Code's
	// `ExtHostLanguageModels` which use `IExtHostAuthentication.getSession`) is complex and
	// depends on Mountain's auth UI and session management. This is omitted for MVP.

	// --- Ignored File Provider Logic (for Proposed API `vscode.lm.registerIgnoredFileProvider`) ---
	/**
	 * {@inheritDoc vscode.lm.registerIgnoredFileProvider} (Conceptual location of this API)
	 * Registers a provider that determines if a file should be ignored by language models.
	 * This is part of a proposed API and its availability/stability might vary.
	 * @param extension The `IExtensionDescription` of the extension registering the provider.
	 * @param provider The `VscodeLanguageModelIgnoredFileProvider` implementation.
	 * @returns An `IDisposable` to unregister the provider.
	 */
	public registerIgnoredFileProvider(
		extension: IExtensionDescription,

		provider: VscodeLanguageModelIgnoredFileProvider,
	): IDisposable {
		// Example of how proposed API check might be done:
		// if (!checkProposedApiEnabled(extension, "languageModelIgnoredFiles" /* Example proposal name */)) {

		//     this._logWarn(`Extension '${extension.identifier.value}' attempted to use proposed API 'registerIgnoredFileProvider' which is not enabled.`);

		// Or throw an error
		//     return Disposable.None;

		// }

		this._logWarnOnce(
			"API registerIgnoredFileProvider is part of a proposed API set. Its behavior and availability may change. " +
				"Ensure the relevant proposed API flag (e.g., 'languageModelIgnoredFiles') is enabled for the extension.",
		);

		// Use static pool for unique handles across all LM provider types.
		const handle = ShimExtHostLanguageModels._providerHandlePool++;

		this.#mainThreadLmProxy
			?.$registerFileIgnoreProvider(handle, extension.identifier)
			.catch((e) =>
				this._logError(
					`RPC call $registerFileIgnoreProvider for Handle ${handle} (Ext: ${extension.identifier.value}) failed:`,

					refineErrorForShim(
						e,

						this._logService,

						"registerIgnoredFileProvider RPC",
					),
				),
			);

		this.#ignoredFileProviders.set(handle, provider);

		this._logInfo(
			`Registered LanguageModelIgnoredFileProvider (Handle ${handle}) for extension '${extension.identifier.value}'.`,
		);

		return toDisposable(() => {
			this._logInfo(
				`Unregistering LanguageModelIgnoredFileProvider (Handle ${handle}) for extension '${extension.identifier.value}'.`,
			);

			this.#mainThreadLmProxy
				?.$unregisterFileIgnoreProvider(handle)
				.catch((e) =>
					this._logError(
						`RPC call $unregisterFileIgnoreProvider for Handle ${handle} failed:`,

						refineErrorForShim(
							e,

							this._logService,

							"unregisterIgnoredFileProvider RPC",
						),
					),
				);

			this.#ignoredFileProviders.delete(handle);
		});
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$isFileIgnored} */
	public async $isFileIgnored(
		// Handle of the registered VscodeLanguageModelIgnoredFileProvider.
		handle: number,

		// URI of the file to check.
		uriComponents: VSCodeInternalUriComponents,

		// Cancellation token for the operation.
		token: CancellationToken,
	): Promise<boolean> {
		const provider = this.#ignoredFileProviders.get(handle);

		if (!provider) {
			this._logError(
				`RPC $isFileIgnored: Unknown LanguageModelIgnoredFileProvider Handle ${handle}. Cannot determine if file is ignored.`,
			);

			throw new Error(
				`Unknown LanguageModelIgnoredFileProvider handle: ${handle}.`,
			);
		}

		// Revive DTO to internal URI, then convert to API URI.
		const uriToApiType = VscodeApiUri.from(URI.revive(uriComponents));

		this._logDebug(
			`RPC $isFileIgnored: Invoking local provider (Handle ${handle}) to check URI '${uriToApiType.toString()}'.`,
		);

		try {
			// Call the extension's provider. Default to `false` (not ignored) if provider returns `undefined`.
			return (
				(await provider.provideFileIgnored(uriToApiType, token)) ??
				false
			);
		} catch (error: any) {
			this._logError(
				`Error in local LanguageModelIgnoredFileProvider (Handle ${handle}) when checking URI '${uriToApiType.toString()}':`,

				error,
			);

			// Rethrow as a generic error or a specific LanguageModelError if appropriate.
			throw VscodeLanguageModelError.Internal(
				"File ignored check by local provider failed.",
			);
		}
	}

	/** Disposes of resources held by this service, including event emitters and pending requests. */
	public override dispose(): void {
		// Handles _instanceDisposables from BaseCocoonShim.
		super.dispose();

		this.#onDidChangeProvidersEmitter.dispose();

		this.#onDidChangeModelAccessEmitter.dispose();

		// Reject any pending chat requests as the service is being disposed.
		this.#pendingChatRequests.forEach((pendingRequestData, requestId) => {
			this._logWarn(
				`Disposing pending chat request ID ${requestId} for model '${pendingRequestData.languageModelId}' due to service disposal.`,
			);

			pendingRequestData.responseStream.reject(
				new Error("Language Model Service has been disposed."),
			);
		});

		this.#pendingChatRequests.clear();

		// Clear locally registered providers.
		this.#localProviders.clear();

		// Clear cached model metadata.
		this.#allLanguageModelsData.clear();

		// Clear access grants.
		this.#modelAccessList.clear();

		this.#languageAccessInformationRequestingExtensions.clear();

		// Clear ignored file providers.
		this.#ignoredFileProviders.clear();

		this._logInfo(
			"Disposed and cleared all language model provider data and pending requests.",
		);
	}
}
