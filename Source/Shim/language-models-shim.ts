/*---------------------------------------------------------------------------------------------
 * Cocoon Language Models Shim (shims/language-models-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtHostLanguageModels` service interface, which underpins the
 * `vscode.lm` (or a similar future namespace) API for Large Language Models (LLMs).
 * This service manages the registration of language model providers by extensions,
 * handles requests from extensions to specific language models, and facilitates
 * streaming responses.
 *
 * For Cocoon's MVP, this shim focuses on:
 * - Providing the structural basis for the `vscode.lm` API.
 * - Defining the correct RPC shapes for communication with `MainThreadLanguageModels`
 *   in Mountain.
 * - Implementing `createLanguageModelAccessInformation()` for extensions to check
 *   their access rights.
 * - Basic provider registration (`registerChatResponseProvider`) and request initiation
 *   (`sendChatRequest`), with streaming response handling.
 * - Many advanced features, full authentication flows beyond a basic check, and
 *   complex error handling or model capabilities are simplified or stubbed.
 *
 * Responsibilities:
 * - Registering `ChatResponseProvider` instances contributed by extensions.
 * - Notifying `MainThreadLanguageModels` about new providers.
 * - Handling `selectLanguageModels` requests by querying `MainThreadLanguageModels`.
 * - Managing `sendChatRequest` calls:
 *   - Performing access/authentication checks (simplified).
 *   - Proxying requests to `MainThreadLanguageModels` (`$tryStartChatRequest`).
 *   - Managing streaming responses via `LanguageModelResponseShim` and handling
 *     `$provideLanguageModelResponse` RPC calls from Mountain.
 * - Providing token counting capabilities, either locally or via RPC.
 * - Implementing `createLanguageModelAccessInformation` for extensions.
 * - Handling updates to model metadata and access lists from Mountain.
 *
 * Key Interactions:
 * - Registered with DI in `Cocoon/index.ts` as `IExtHostLanguageModels`.
 * - The `vscode.lm` API (when available to extensions) delegates to this service.
 * - Communicates extensively with `MainContext.MainThreadLanguageModels` on Mountain.
 * - Is an RPC service target for calls from Mountain, identified by
 *   `ExtHostContext.ExtHostChatProvider` (as per VS Code's naming).
 * - May interact with `IExtHostAuthentication` for access control (simplified in MVP).
 * - Uses `BaseCocoonShim` and relies on (currently MOCK) `typeConvert` utilities.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
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
import { URI, type UriComponents } from "vs/base/common/uri"; // Internal URI for consistency
import {
	ExtensionIdentifier,
	ExtensionIdentifierMap,
	ExtensionIdentifierSet,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { Progress } from "vs/platform/progress/common/progress"; // For Progress<T> type in options
import {
	ExtHostContext,
	MainContext,
	SerializableObjectWithBuffers, // For sending complex data with buffers
	type ExtHostLanguageModelsShape, // This service implements this RPC shape
	type MainThreadLanguageModelsShape,
	type IChatMessage as RpcChatMessage,
	type IChatResponseFragment as RpcChatResponseFragment,
	type ILanguageModelChatMetadata as RpcLanguageModelChatMetadata,
	type ILanguageModelsChangeEvent as RpcLanguageModelsChangeEvent,
	// Other DTOs from extHost.protocol.ts:
	// type IChatRequestVariableData, type IChatVariableData, type IChatVariableResolverProgressDto,
	// type IRelaxedChatMessage, type IChatDto, type IChatResponseDto, type IChatWelcomeMessage,
	// type ILanguageModelToolsCandidate, type IToolCallHistory,
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication"; // For auth logic

// Assuming typeConvert provides necessary DTO <-> API type conversions.
// In a real setup: import * as typeConvert from 'vs/workbench/api/common/extHostTypeConverters';
import * as extHostTypes from "vs/workbench/api/common/extHostTypes"; // For LanguageModelError, etc.
import {
	type ChatRequestAgentPart,
	type ChatRequestTextPart,
	type ChatRequestToolPart,
} from "vs/workbench/contrib/chat/common/chatRequestParser";
import type {
	ChatAgentHover,
	ChatAgentKakkarHistoryEntry,
	IChatResponsePart,
} from "vs/workbench/contrib/chat/common/languageModels";
// For streaming parts
import { DEFAULT_MODEL_PICKER_CATEGORY } from "vs/workbench/contrib/chat/common/modelPicker/modelPickerWidget";
import { INTERNAL_AUTH_PROVIDER_PREFIX } from "vs/workbench/services/authentication/common/authentication"; // For auth hack
import { checkProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions"; // For proposed API checks

// Import from public 'vscode' API definition
import {
	LanguageModelChatMessageRole as VscodeLanguageModelChatMessageRole,
	LanguageModelError as VscodeLanguageModelError, // API Error type
	type CancellationToken as VscodeCancellationToken,
	type ChatResponseProvider as VscodeChatResponseProvider,
	type ChatResponseProviderMetadata as VscodeChatResponseProviderMetadata,
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	type LanguageModelChat as VscodeLanguageModelChat,
	type LanguageModelChatMessage2 as VscodeLanguageModelChatMessage2, // Using the '2' version
	type LanguageModelChatRequestOptions as VscodeLanguageModelChatRequestOptions,
	type LanguageModelChatResponse as VscodeLanguageModelChatResponse,
	type LanguageModelChatResponsePart as VscodeLanguageModelChatResponsePart, // Union of Text, Tool, Data parts
	type LanguageModelChatSelector as VscodeLanguageModelChatSelector,
	type LanguageModelDataPart as VscodeLanguageModelDataPart,
	type LanguageModelIgnoredFileProvider as VscodeLanguageModelIgnoredFileProvider, // For proposed API
	type LanguageModelTextPart as VscodeLanguageModelTextPart,
	type LanguageModelToolCallPart as VscodeLanguageModelToolCallPart,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Placeholder for extHostTypeConverters ---
// TODO: Replace with actual converters from 'vs/workbench/api/common/extHostTypeConverters'.
const localApiTypeConverters = {
	LanguageModelChatMessage2: {
		from: (message: VscodeLanguageModelChatMessage2): RpcChatMessage => {
			// MOCK CONVERSION: Needs to handle different message part types (text, tool, data)
			// and convert them to the RpcChatMessage DTO structure.
			let content: string | RpcChatMessage["content"][0][] = ""; // Simplified
			if (typeof message.content === "string") {
				content = message.content;
			} else if (Array.isArray(message.content)) {
				content = message.content.map((part) => {
					if (part instanceof extHostTypes.LanguageModelTextPart) {
						return {
							type: "text",
							text: part.value,
						} as ChatRequestTextPart; // Aligns with internal part types
					}
					// TODO: Handle LanguageModelDataPart, LanguageModelToolCallPart conversion to their respective DTO/internal part types
					return {
						type: "text",
						text: "[unsupported part]",
					} as ChatRequestTextPart;
				});
			}
			return {
				role:
					message.role === VscodeLanguageModelChatMessageRole.User
						? 0
						: 1, // Map User/Assistant to 0/1 if that's the DTO
				content: content as any, // Ensure this matches RpcChatMessage content type
				name: message.name,
			};
		},
		to: (dto: RpcChatMessage): VscodeLanguageModelChatMessage2 => {
			// MOCK CONVERSION from RpcChatMessage DTO to VscodeLanguageModelChatMessage2
			let content: string | VscodeLanguageModelChatResponsePart[] = "";
			if (typeof dto.content === "string") {
				content = dto.content;
			} else if (Array.isArray(dto.content)) {
				// This is complex: dto.content is (ChatRequestTextPart | ChatRequestToolPart | ChatRequestAgentPart)[]
				// Needs mapping to VscodeLanguageModelTextPart | VscodeLanguageModelToolCallPart | VscodeLanguageModelDataPart
				content = (dto.content as any[]).map((partDto) => {
					if (partDto.type === "text")
						return new extHostTypes.LanguageModelTextPart(
							partDto.text,
						);
					// TODO: Handle tool_call, data parts
					return new extHostTypes.LanguageModelTextPart(
						"[unsupported DTO part]",
					);
				});
			}
			return new extHostTypes.LanguageModelChatMessage(
				dto.role === 0
					? VscodeLanguageModelChatMessageRole.User
					: VscodeLanguageModelChatMessageRole.System, // Adjust mapping
				content,
				dto.name,
			) as VscodeLanguageModelChatMessage2;
		},
	},
	// ... other necessary converters ...
};

// --- Internal Data Structures ---

/** Stores data for a language model provider registered by an extension. */
type LanguageModelProviderData = {
	readonly languageModelId: string; // The short ID given by the extension (e.g., "copilot-gpt-3.5-turbo")
	readonly extension: ExtensionIdentifier; // Extension that contributed this provider
	readonly provider: VscodeChatResponseProvider; // The actual provider instance
	readonly metadata: VscodeChatResponseProviderMetadata; // Metadata provided at registration
};

/** Stores data for all language models known to the system (typically synced from MainThread). */
interface AllLanguageModelEntry {
	metadata: RpcLanguageModelChatMetadata; // DTO received from MainThread
	// Cache of VscodeLanguageModelChat API objects, keyed by the requesting extension's ID.
	// This allows different extensions to get distinct API objects if needed, though often they share.
	apiObjects: ExtensionIdentifierMap<VscodeLanguageModelChat>;
}

/** Manages the streaming response for a single language model request option. */
class LanguageModelResponseStreamShim {
	readonly stream: AsyncIterableSource<VscodeLanguageModelChatResponsePart>;
	constructor(
		readonly optionIndex: number, // Corresponds to RpcChatResponseFragment.index
		preassignedStream?: AsyncIterableSource<VscodeLanguageModelChatResponsePart>,
	) {
		this.stream =
			preassignedStream ||
			new AsyncIterableSource<VscodeLanguageModelChatResponsePart>();
	}
}

/**
 * Manages the overall streaming response for a `sendChatRequest` call, which might
 * involve multiple response options (though typically one for most models).
 */
class LanguageModelResponseShim {
	readonly apiObject: VscodeLanguageModelChatResponse; // The public API object returned to the extension.
	private readonly _responseStreams = new Map<
		number,
		LanguageModelResponseStreamShim
	>(); // Key: optionIndex
	private readonly _defaultStream: LanguageModelResponseStreamShim; // Primary stream (usually index 0)
	private _isDone = false; // Flag to indicate if the response is complete (resolved or rejected)

	constructor() {
		this._defaultStream = new LanguageModelResponseStreamShim(0);
		this._responseStreams.set(0, this._defaultStream); // Pre-populate for index 0

		const that = this;
		this.apiObject = Object.freeze({
			// Public API object should be immutable
			get stream() {
				return that._defaultStream.stream.asyncIterable;
			},
			get text() {
				// Asynchronously concatenates all text parts from the default stream
				return AsyncIterableObject.map(
					that._defaultStream.stream.asyncIterable,
					(part) =>
						part instanceof extHostTypes.LanguageModelTextPart
							? part.value
							: undefined,
				).coalesce();
			},
			// TODO: Implement other properties on VscodeLanguageModelChatResponse if they exist,
			// e.g., `result` (for final aggregated result), `error` (if request failed).
			// These would be populated when `resolve()` or `reject()` is called.
		});
	}

	private *_getActiveStreams(): Iterable<
		AsyncIterableSource<VscodeLanguageModelChatResponsePart>
	> {
		if (this._responseStreams.size > 0) {
			for (const streamHolder of this._responseStreams.values())
				yield streamHolder.stream;
		} else {
			// Should ideally not happen if constructor sets one
			yield this._defaultStream.stream;
		}
	}

	/** Handles an incoming response fragment from the MainThread. */
	handleFragment(fragmentDto: RpcChatResponseFragment): void {
		if (this._isDone) return; // Ignore fragments if response is already marked done

		let streamHolder = this._responseStreams.get(fragmentDto.index);
		if (!streamHolder) {
			// Create a new stream if this fragment index is new
			streamHolder = new LanguageModelResponseStreamShim(
				fragmentDto.index,
			);
			this._responseStreams.set(fragmentDto.index, streamHolder);
		}

		// Convert RpcChatResponseFragment.part (DTO) to a vscode.LanguageModelChatResponsePart (API type)
		let apiPart: VscodeLanguageModelChatResponsePart;
		const partDto = fragmentDto.part as IChatResponsePart; // Cast to VS Code's internal part type for easier handling

		if (partDto.kind === "text") {
			apiPart = new extHostTypes.LanguageModelTextPart(
				partDto.content.value,
			);
		} else if (partDto.kind === "toolComamén") {
			// Note: Protocol uses 'toolComamén', API uses 'tool_code' or 'tool_use'
			// Assuming 'toolComamén' maps to 'tool_use' for API.
			// This DTO structure for tool calls needs to match what MainThreadLanguageModels sends.
			// VS Code's internal IChatResponseToolPart has `id`, `name`, `args`.
			const toolPartPayload = partDto.content as any; // Adjust cast based on actual DTO
			apiPart = new extHostTypes.LanguageModelToolCallPart(
				toolPartPayload.id ||
					`tool_${Date.now()}_${Math.random().toString(36).substring(2)}`, // Ensure unique ID
				toolPartPayload.name || "",
				toolPartPayload.args || {}, // Assuming args is the parameters object
			);
		} else if (partDto.kind === "dataBuffer") {
			// Assuming 'dataBuffer' maps to LanguageModelDataPart
			const dataPartPayload = partDto.content as {
				mimeType: string;
				data: VSBuffer;
			};
			apiPart = new extHostTypes.LanguageModelDataPart(
				dataPartPayload.data.buffer,
				dataPartPayload.mimeType,
			);
		} else {
			console.warn(
				`[LM Shim] Unknown/unsupported chat response fragment part kind: '${partDto.kind}'. Skipping fragment.`,
			);
			return;
		}
		streamHolder.stream.emitOne(apiPart);
	}

	/** Rejects all active streams with the given error. */
	reject(err: Error): void {
		if (this._isDone) return;
		this._isDone = true;
		for (const stream of this._getActiveStreams()) stream.reject(err);
	}

	/** Resolves (completes) all active streams. */
	resolve(): void {
		if (this._isDone) return;
		this._isDone = true;
		for (const stream of this._getActiveStreams()) stream.resolve();
	}
}

/**
 * Cocoon's implementation of `IExtHostLanguageModels`.
 * Manages language model providers, requests, and access information.
 */
export class ShimExtHostLanguageModels
	extends BaseCocoonShim
	implements ExtHostLanguageModelsShape
{
	// Implements RPC shape for calls from MainThread
	public readonly _serviceBrand: undefined; // For IExtHostLanguageModels DI

	private static _providerHandlePool = 1; // Static counter for unique provider handles
	readonly #mainThreadLmProxy: MainThreadLanguageModelsShape | null = null;

	readonly #onDidChangeProvidersEmitter = new VscodeEmitter<void>(); // For vscode.lm.onDidChangeProviders (if API has it)
	public readonly onDidChangeProviders: VscodeEvent<void> =
		this.#onDidChangeProvidersEmitter.event;

	readonly #localProviders = new Map<number, LanguageModelProviderData>(); // Key: handle
	readonly #allLanguageModelsData = new Map<string, AllLanguageModelEntry>(); // Key: fullModelId (e.g., "ext.id/modelId")
	readonly #modelAccessList =
		new ExtensionIdentifierMap<ExtensionIdentifierSet>(); // Tracks access grants: Map<requestingExtId, Set<providingExtId>>
	readonly #languageAccessInformationRequestingExtensions = new Set<
		Readonly<IExtensionDescription>
	>(); // For LMAI.onDidChange

	readonly #onDidChangeModelAccessEmitter = new VscodeEmitter<{
		from: ExtensionIdentifier;
		to: ExtensionIdentifier;
	}>(); // Internal event

	readonly #pendingChatRequests = new Map<
		number,
		{ languageModelId: string; responseStream: LanguageModelResponseShim }
	>(); // Key: requestId
	#chatRequestIdPool = 0; // Counter for unique chat request IDs

	readonly #ignoredFileProviders = new Map<
		number,
		VscodeLanguageModelIgnoredFileProvider
	>(); // For proposed API

	/**
	 * Creates an instance of ShimExtHostLanguageModels.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 * @param _extHostAuthentication Optional: Authentication service for access control (simplified in MVP).
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		private readonly _extHostAuthentication?: IExtHostAuthentication, // Optional for auth logic
	) {
		super("ExtHostLanguageModels", rpcService, logService);
		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadLmProxy = this._getProxy(
				MainContext.MainThreadLanguageModels as ProxyIdentifier<MainThreadLanguageModelsShape>,
			);
			try {
				// VS Code uses ExtHostChatProvider as the context ID for this service.
				this._rpcService.set(
					ExtHostContext.ExtHostChatProvider as ProxyIdentifier<ExtHostLanguageModelsShape>,
					this,
				);
				this._log(
					"Registered self for RPC calls (ExtHostChatProvider for Language Models).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostChatProvider):",
					e,
				);
			}
		}
		if (!this.#mainThreadLmProxy) {
			this._logWarn(
				"MainThreadLanguageModels RPC proxy not available. Language Model features will be non-functional.",
			);
		}

		// Listen to internal access change events to update relevant LanguageModelAccessInformation instances
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
							// TODO: If LanguageModelAccessInformation instances had their own emitters,
							// they would be fired here to signal a potential change in `accessAllowed`.
							// For now, LMAI.onDidChange is VscodeEvent.None.
						}
					},
				);
			}),
		);
	}

	// --- vscode.lm.* API implementation (methods called by extensions) ---

	/**
	 * Registers a chat response provider.
	 * @param extension The extension contributing the provider.
	 * @param identifier A unique identifier for the language model within the extension.
	 * @param provider The chat response provider implementation.
	 * @param metadata Metadata about the language model.
	 * @returns A disposable to unregister the provider.
	 */
	public registerChatResponseProvider(
		extension: IExtensionDescription,
		identifier: string, // Model ID within the extension (e.g., "gpt-3.5-turbo")
		provider: VscodeChatResponseProvider,
		metadata: VscodeChatResponseProviderMetadata,
	): IDisposable {
		const handle = ShimExtHostLanguageModels._providerHandlePool++;
		const fullModelId = `${extension.identifier.value}/${identifier}`; // Globally unique ID
		this._log(
			`Registering ChatResponseProvider: Handle=${handle}, FullID='${fullModelId}', Name='${metadata.name || identifier}'`,
		);

		this.#localProviders.set(handle, {
			extension: extension.identifier,
			provider,
			languageModelId: identifier,
			metadata,
		});

		// Convert VscodeChatResponseProviderMetadata (API type) to RpcLanguageModelChatMetadata (DTO for RPC)
		const rpcMetadata: RpcLanguageModelChatMetadata = {
			extension: extension.identifier, // The contributing extension
			id: identifier, // The model's short ID within the extension
			vendor:
				metadata.vendor ??
				extension.publisher ??
				extension.identifier.value, // Default vendor to publisher or ext ID
			name: metadata.name ?? identifier, // Default name to identifier
			version: metadata.version,
			family: metadata.family,
			maxInputTokens: metadata.maxInputTokens,
			maxOutputTokens: metadata.maxOutputTokens, // Note: VscodeChatResponseProviderMetadata might not have maxOutputTokens directly.
			auth: metadata.auth
				? {
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
			),
			isDefault: metadata.isDefault,
			isUserSelectable: metadata.isUserSelectable !== false, // Default true if not specified
			modelPickerCategory:
				metadata.category || DEFAULT_MODEL_PICKER_CATEGORY,
			capabilities: metadata.capabilities
				? {
						vision: !!metadata.capabilities.vision,
						toolCalling: !!metadata.capabilities.toolCalling,
						chaining: !!metadata.capabilities.chaining,
					}
				: undefined,
		};

		this.#mainThreadLmProxy
			?.$registerLanguageModelProvider(handle, fullModelId, rpcMetadata)
			.catch((e) =>
				this._logError(
					`RPC $registerLanguageModelProvider for '${fullModelId}' (Handle ${handle}) failed:`,
					refineErrorForShim(e, this._logService),
				),
			);

		const responseListener = provider.onDidReceiveLanguageModelResponse2?.(
			({ extensionId, participant, tokenCount }) => {
				this.#mainThreadLmProxy?.$whenLanguageModelChatRequestMade(
					fullModelId,
					new ExtensionIdentifier(extensionId), // Requesting extension
					participant,
					tokenCount,
				);
			},
		);
		if (responseListener) this._instanceDisposables.add(responseListener);

		return toDisposable(() => {
			this._log(
				`Unregistering ChatResponseProvider: Handle=${handle}, FullID='${fullModelId}'`,
			);
			this.#localProviders.delete(handle);
			this.#mainThreadLmProxy
				?.$unregisterProvider(handle)
				.catch((e) =>
					this._logError(
						`RPC $unregisterProvider for Handle ${handle} failed:`,
						refineErrorForShim(e, this._logService),
					),
				);
			if (responseListener) responseListener.dispose();
		});
	}

	/**
	 * Allows an extension to select language models based on specified criteria.
	 * @param extension The extension making the selection request.
	 * @param selector Criteria for selecting models.
	 * @returns A promise resolving to an array of `vscode.LanguageModelChat` API objects.
	 */
	public async selectLanguageModels(
		extension: IExtensionDescription,
		selector: VscodeLanguageModelChatSelector,
	): Promise<VscodeLanguageModelChat[]> {
		this._log(
			`API selectLanguageModels by Ext='${extension.identifier.value}', Selector=${JSON.stringify(selector)}`,
		);
		if (!this.#mainThreadLmProxy) {
			this._logError(
				"Cannot selectLanguageModels: MainThreadLanguageModels RPC proxy unavailable.",
			);
			return [];
		}
		try {
			// The selector DTO might need conversion if VscodeLanguageModelChatSelector is not directly compatible.
			// Assuming VscodeLanguageModelChatSelector is compatible with protocol.ILanguageModelChatSelector DTO.
			const selectedModelIds =
				await this.#mainThreadLmProxy.$selectChatModels({
					...selector, // Spread selector properties
					extension: extension.identifier, // Add requesting extension ID
				});
			const result: VscodeLanguageModelChat[] = [];
			for (const modelId of selectedModelIds) {
				// modelId here is the full ID like "publisher.name/modelShortId"
				const modelApiObject = this._createApiObjectForModel(
					extension,
					modelId,
				);
				if (modelApiObject) result.push(modelApiObject);
			}
			return result;
		} catch (e: any) {
			this._logError(
				"RPC $selectChatModels failed:",
				refineErrorForShim(e, this._logService),
			);
			return [];
		}
	}

	/**
	 * Sends a chat request to a specified language model. This is the implementation
	 * backing `VscodeLanguageModelChat.sendRequest`.
	 * @param requestingExtension The extension initiating the request.
	 * @param modelId The full identifier of the target language model.
	 * @param requestMessages An array of chat messages forming the request.
	 * @param options Additional options for the request.
	 * @param token A cancellation token for the request.
	 * @returns A promise resolving to a `VscodeLanguageModelChatResponse` object, which includes the streaming response.
	 */
	public async sendChatRequest(
		requestingExtension: IExtensionDescription,
		modelId: string, // Full model ID
		requestMessages: VscodeLanguageModelChatMessage2[],
		options: VscodeLanguageModelChatRequestOptions,
		token: VscodeCancellationToken,
	): Promise<VscodeLanguageModelChatResponse> {
		// this._log(`API sendChatRequest from Ext='${requestingExtension.identifier.value}' to Model='${modelId}', Messages=${requestMessages.length}`);

		const modelDataEntry = this.#allLanguageModelsData.get(modelId);
		if (!modelDataEntry) {
			throw VscodeLanguageModelError.NotFound(
				`Language model '${modelId}' is unknown or not available.`,
			);
		}

		// Simplified Access Check (based on VS Code's _getAuthAccess)
		if (
			this._isAuthNeeded(
				requestingExtension.identifier,
				modelDataEntry.metadata,
			)
		) {
			const hasAccess = this.#modelAccessList
				.get(requestingExtension.identifier)
				?.has(modelDataEntry.metadata.extension);
			if (!hasAccess) {
				// TODO: A full implementation would trigger an auth flow here using this._extHostAuthentication.getSession(...)
				// and then update #modelAccessList upon success.
				this._logWarn(
					`Auth check: Extension '${requestingExtension.identifier.value}' needs access to model '${modelId}' (from ext '${modelDataEntry.metadata.extension.value}'), but no grant found. Access denied (MVP stub).`,
				);
				throw VscodeLanguageModelError.NoPermissions(
					`Access to language model '${modelId}' denied for extension '${requestingExtension.identifier.value}'. Authentication or grant may be required.`,
				);
			}
		}

		const requestId = ++this.#chatRequestIdPool;
		const responseShim = new LanguageModelResponseShim();
		this.#pendingChatRequests.set(requestId, {
			languageModelId: modelId,
			responseStream: responseShim,
		});

		const rpcMessages: RpcChatMessage[] = requestMessages.map((m) =>
			localApiTypeConverters.LanguageModelChatMessage2.from(m),
		);
		// Wrap if messages contain buffers (e.g., from LanguageModelDataPart)
		const messagesPayload = this._wrapIfContainsBuffer(rpcMessages);

		if (token.isCancellationRequested) {
			// Check token before making RPC call
			this.#pendingChatRequests.delete(requestId);
			responseShim.reject(new CancellationError());
			return responseShim.apiObject;
		}

		const cancellationListener = token.onCancellationRequested(() => {
			const pendingRequest = this.#pendingChatRequests.get(requestId);
			if (pendingRequest) {
				pendingRequest.responseStream.reject(new CancellationError());
				this.#pendingChatRequests.delete(requestId);
				this.#mainThreadLmProxy
					?.$cancelChatRequest(requestId) // Notify MainThread if protocol supports it
					.catch((e) =>
						this._logWarn(
							`Failed to send $cancelChatRequest for ID ${requestId}:`,
							e,
						),
					);
			}
		});
		// Ensure listener is disposed when request completes or is rejected by other means
		const ensureListenerDisposed = () => cancellationListener.dispose();

		this.#mainThreadLmProxy!.$tryStartChatRequest(
			// Assert proxy exists, checked earlier or throw
			requestingExtension.identifier,
			modelId,
			requestId,
			messagesPayload,
			options, // Assuming VscodeLanguageModelChatRequestOptions is compatible with protocol DTO
			undefined, // No explicit CancellationToken ID passed for MVP, cancellation handled ExtHost-side
		).then(ensureListenerDisposed, (err) => {
			// Handle promise rejection from $tryStartChatRequest
			const pendingRequest = this.#pendingChatRequests.get(requestId);
			if (pendingRequest) {
				// Error might be a SerializedError from RPC
				pendingRequest.responseStream.reject(
					VscodeLanguageModelError.tryDeserialize(err) ??
						transformErrorFromSerialization(err),
				);
				this.#pendingChatRequests.delete(requestId);
			}
			ensureListenerDisposed();
		});

		return responseShim.apiObject;
	}

	/** Helper to wrap data in SerializableObjectWithBuffers if it contains VSBuffer. */
	private _wrapIfContainsBuffer<T>(
		data: T,
	): T | SerializableObjectWithBuffers<T> {
		let containsBuffer = false;
		if (Array.isArray(data)) {
			containsBuffer = data.some(
				(item) =>
					VSBuffer.isVSBuffer(item) ||
					(typeof item === "object" &&
						item !== null &&
						Object.values(item).some(VSBuffer.isVSBuffer)),
			);
		} else if (typeof data === "object" && data !== null) {
			containsBuffer = Object.values(data).some(VSBuffer.isVSBuffer);
		}
		return containsBuffer ? new SerializableObjectWithBuffers(data) : data;
	}

	/** Creates or retrieves a cached `vscode.LanguageModelChat` API object for a model. */
	private _createApiObjectForModel(
		requestingExtension: IExtensionDescription,
		modelId: string,
	): VscodeLanguageModelChat | undefined {
		const modelEntry = this.#allLanguageModelsData.get(modelId);
		if (!modelEntry) {
			this._logWarn(
				`_createApiObjectForModel: No metadata found for model ID '${modelId}'. Cannot create API object.`,
			);
			return undefined;
		}

		let apiObject = modelEntry.apiObjects.get(
			requestingExtension.identifier,
		);
		if (!apiObject) {
			const metadata = modelEntry.metadata; // RpcLanguageModelChatMetadata
			const self = this; // For closure

			apiObject = Object.freeze({
				id: metadata.id, // This is the full model ID (e.g., "publisher.name/modelShortId")
				vendor: metadata.vendor,
				name: metadata.name,
				family: metadata.family,
				version: metadata.version,
				maxInputTokens: metadata.maxInputTokens,
				// maxOutputTokens is often on the provider metadata, not directly on VscodeLanguageModelChat
				get capabilities() {
					// Getter for dynamic capabilities if they could change
					return Object.freeze({
						// Map from RpcLanguageModelChatMetadata.capabilities
						vision: !!metadata.capabilities?.vision,
						toolCalling: !!metadata.capabilities?.toolCalling,
						chaining: !!metadata.capabilities?.chaining,
					});
				},
				countTokens: (
					textOrMessages:
						| string
						| VscodeLanguageModelChatMessage2
						| VscodeLanguageModelChatMessage2[],
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

	/** Helper to count tokens, either locally or via RPC. */
	private async _countTokensForModel(
		modelId: string, // Full model ID
		textOrMessages:
			| string
			| VscodeLanguageModelChatMessage2
			| VscodeLanguageModelChatMessage2[],
		token: VscodeCancellationToken,
	): Promise<number> {
		// this._logService?.trace(`_countTokensForModel: Model='${modelId}'`);

		// Check if the provider for this modelId is local (registered in this ExtHost)
		const localProviderData = Iterable.find(
			this.#localProviders.values(),
			(p) => `${p.extension.value}/${p.languageModelId}` === modelId,
		);

		if (localProviderData?.provider.provideTokenCount) {
			try {
				// The provider expects API types (VscodeLanguageModelChatMessage2 or string).
				// VscodeLanguageModelChatMessage2 itself might be a simple string or an array of parts.
				// The `provideTokenCount` signature is `(value: string | LanguageModelChatMessage, token: CancellationToken) => ProviderResult<number>;`
				// We need to ensure `textOrMessages` is correctly passed.
				let inputForProvider: string | VscodeLanguageModelChatMessage2;
				if (typeof textOrMessages === "string") {
					inputForProvider = textOrMessages;
				} else if (Array.isArray(textOrMessages)) {
					// If it's an array, the API implies counting for the whole array, but provider takes single message.
					// This might need clarification or joining content if provider doesn't handle array.
					// For now, assume provider can handle array or we send the first message.
					// VS Code's `provideTokenCount` often takes just one `LanguageModelChatMessage`.
					this._logWarnOnce(
						`_countTokensForModel: Passing array of messages to local provider.provideTokenCount. Ensure provider handles this or adapt.`,
					);
					inputForProvider = textOrMessages[0]; // Simplification: use first message if array
				} else {
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
					`Error in local provider's provideTokenCount for model '${modelId}':`,
					e,
				);
				throw VscodeLanguageModelError.Internal(
					"Token counting failed due to provider error.",
				);
			}
		}

		// If not local, or local provider doesn't have provideTokenCount, proxy to main thread.
		if (!this.#mainThreadLmProxy) {
			throw VscodeLanguageModelError.Internal(
				"MainThreadLanguageModels proxy unavailable for countTokens operation.",
			);
		}
		// Convert to DTO for RPC. $countTokens likely expects string or a single RpcChatMessage.
		const rpcValue =
			typeof textOrMessages === "string"
				? textOrMessages
				: localApiTypeConverters.LanguageModelChatMessage2.from(
						Array.isArray(textOrMessages)
							? textOrMessages[0]
							: textOrMessages, // Send first message if array
					);
		return this.#mainThreadLmProxy.$countTokens(modelId, rpcValue, token);
	}

	// --- createLanguageModelAccessInformation (Called by ExtHostExtensionService) ---
	/**
	 * Creates an `LanguageModelAccessInformation` object for a given extension.
	 * This object allows the extension to check its access status to language models.
	 * @param requestingExtension The extension for which to create access information.
	 */
	public createLanguageModelAccessInformation(
		requestingExtension: IExtensionDescription,
	): VscodeLanguageModelAccessInformation {
		// this._log(`createLanguageModelAccessInformation for Ext='${requestingExtension.identifier.value}'`);
		this.#languageAccessInformationRequestingExtensions.add(
			requestingExtension,
		); // Track for onDidChange updates

		const self = this;
		return Object.freeze({
			get accessAllowed(): boolean {
				// `accessAllowed` means: can this extension potentially access *any* model that might require auth?
				// If there's at least one model that requires auth FROM this extension, and this extension
				// doesn't have a grant TO that model's provider, then access might be "false" until granted.
				// This is a simplification. VS Code's `canSendRequest(modelId)` is more granular.
				for (const modelEntry of self.#allLanguageModelsData.values()) {
					if (
						self._isAuthNeeded(
							requestingExtension.identifier,
							modelEntry.metadata,
						)
					) {
						if (
							!self.#modelAccessList
								.get(requestingExtension.identifier)
								?.has(modelEntry.metadata.extension)
						) {
							// This extension needs access to at least one model from another ext, and doesn't have it.
							return false;
						}
					}
				}
				return true; // Access granted or no models require specific auth from this extension.
			},
			// TODO: This onDidChange should fire when the result of `accessAllowed` might change
			// for this specific `requestingExtension`. This requires LanguageModelAccessInformation
			// to hold its own emitter and listen to `this.#onDidChangeModelAccessEmitter`, filtering for relevant events.
			onDidChange: VscodeEvent.None, // Placeholder for MVP
		});
	}

	// --- RPC methods called BY MainThread (ExtHostLanguageModelsShape) ---

	/** {@inheritDoc ExtHostLanguageModelsShape.$acceptChatModelMetadata} */
	public $acceptChatModelMetadata(data: RpcLanguageModelsChangeEvent): void {
		// this._logService?.trace(`RPC $acceptChatModelMetadata: Added=${data.added?.length ?? 0}, Removed=${data.removed?.length ?? 0}`);
		let changed = false;
		if (data.added) {
			for (const { identifier: fullModelId, metadata } of data.added) {
				if (
					!this.#allLanguageModelsData.has(fullModelId) ||
					JSON.stringify(
						this.#allLanguageModelsData.get(fullModelId)?.metadata,
					) !== JSON.stringify(metadata)
				) {
					this.#allLanguageModelsData.set(fullModelId, {
						metadata,
						apiObjects: new ExtensionIdentifierMap(),
					});
					changed = true;
				}
				// TODO: VS Code's original does this: data.added?.forEach(added => this._fakeAuthPopulate(added.metadata));
				// This pre-checks/establishes auth sessions silently. For MVP, this is skipped.
			}
		}
		if (data.removed) {
			for (const fullModelId of data.removed) {
				if (this.#allLanguageModelsData.delete(fullModelId)) {
					changed = true;
				}
				// Cancel any pending requests for removed models
				for (const [requestId, pendingRequest] of this
					.#pendingChatRequests) {
					if (pendingRequest.languageModelId === fullModelId) {
						pendingRequest.responseStream.reject(
							VscodeLanguageModelError.NotFound(
								`Language model '${fullModelId}' was removed.`,
							),
						);
						this.#pendingChatRequests.delete(requestId);
					}
				}
			}
		}
		if (changed) {
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
		// this._logService?.trace(`RPC $updateModelAccesslist: ${entries.length} entries`);
		for (const { from, to, enabled } of entries) {
			let accessSet = this.#modelAccessList.get(from);
			if (!accessSet) {
				if (!enabled) continue; // No need to create set for a disable if it doesn't exist
				accessSet = new ExtensionIdentifierSet();
				this.#modelAccessList.set(from, accessSet);
			}
			const changed = enabled ? accessSet.add(to) : accessSet.delete(to);
			if (changed) this.#onDidChangeModelAccessEmitter.fire({ from, to }); // Fire internal event
		}
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$provideLanguageModelResponse} */
	public async $provideLanguageModelResponse(
		_chatHandle_unused: number,
		requestId: number,
		responseDto: RpcChatResponseFragment,
		isLast: boolean,
	): Promise<void> {
		// this._logService?.trace(`RPC $provideLanguageModelResponse for RequestID ${requestId}, Index ${responseDto.index}, IsLast: ${isLast}`);
		const pendingRequest = this.#pendingChatRequests.get(requestId);
		if (pendingRequest) {
			try {
				pendingRequest.responseStream.handleFragment(responseDto);
				if (isLast) {
					pendingRequest.responseStream.resolve();
					this.#pendingChatRequests.delete(requestId);
				}
			} catch (e: any) {
				this._logError(
					`Error handling response fragment for RequestID ${requestId}:`,
					e,
				);
				pendingRequest.responseStream.reject(
					new Error(
						`Failed to process response fragment: ${e.message || String(e)}`,
					),
				);
				this.#pendingChatRequests.delete(requestId);
			}
		} else {
			this._logWarn(
				`Received response fragment for unknown or completed RequestID: ${requestId}. Ignoring.`,
			);
		}
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$provideTokenLength} */
	public async $provideTokenLength(
		handle: number,
		valueOrMessageDto: string | RpcChatMessage,
		token: CancellationToken,
	): Promise<number> {
		const providerData = this.#localProviders.get(handle);
		if (!providerData?.provider.provideTokenCount) {
			this._logError(
				`$provideTokenLength: No local provider or provideTokenCount method for Handle ${handle}.`,
			);
			throw new Error(
				"Provider does not support token counting or not found.",
			);
		}
		// Convert RpcChatMessage DTO back to vscode.LanguageModelChatMessage2 API type
		let apiValue: string | VscodeLanguageModelChatMessage2 =
			typeof valueOrMessageDto === "string"
				? valueOrMessageDto
				: localApiTypeConverters.LanguageModelChatMessage2.to(
						valueOrMessageDto,
					);

		return providerData.provider.provideTokenCount(apiValue, token);
	}

	// --- Auth "Hack" related (simplified from VS Code's ExtHostLanguageModels) ---
	/** Checks if authentication might be needed for a requesting extension to use a model from a providing extension. */
	private _isAuthNeeded(
		requestingExtensionId: ExtensionIdentifier,
		modelOwnerMetadata: RpcLanguageModelChatMetadata,
	): modelOwnerMetadata is RpcLanguageModelChatMetadata & {
		auth: NonNullable<RpcLanguageModelChatMetadata["auth"]>;
	} {
		return (
			!!modelOwnerMetadata.auth && // Model declares it might need auth
			!ExtensionIdentifier.equals(
				modelOwnerMetadata.extension,
				requestingExtensionId,
			) && // Not the same extension
			!modelOwnerMetadata.extension.value.startsWith(
				INTERNAL_AUTH_PROVIDER_PREFIX,
			) // Provider is not an internal auth provider
		);
	}
	// Full _fakeAuthPopulate and _getAuthAccess methods (which use IExtHostAuthentication.getSession) are complex
	// and depend on Mountain's auth flow. For MVP, they are simplified or omitted.

	// --- Ignored File Provider Logic (Proposed API) ---
	/** {@inheritDoc vscode.lm.registerIgnoredFileProvider} (Conceptual location) */
	public registerIgnoredFileProvider(
		extension: IExtensionDescription,
		provider: VscodeLanguageModelIgnoredFileProvider,
	): IDisposable {
		// checkProposedApiEnabled(extension, "chatParticipantPrivate"); // Or similar proposal name
		this._logWarnOnce(
			"registerIgnoredFileProvider is a proposed API and may have limited support or require specific enablement.",
		);
		const handle = ShimExtHostLanguageModels._providerHandlePool++;
		this.#mainThreadLmProxy
			?.$registerFileIgnoreProvider(handle, extension.identifier)
			.catch((e) =>
				this._logError(
					`RPC $registerFileIgnoreProvider for Handle ${handle} failed:`,
					e,
				),
			);
		this.#ignoredFileProviders.set(handle, provider);
		return toDisposable(() => {
			this.#mainThreadLmProxy
				?.$unregisterFileIgnoreProvider(handle)
				.catch((e) =>
					this._logError(
						`RPC $unregisterFileIgnoreProvider for Handle ${handle} failed:`,
						e,
					),
				);
			this.#ignoredFileProviders.delete(handle);
		});
	}

	/** {@inheritDoc ExtHostLanguageModelsShape.$isFileIgnored} */
	public async $isFileIgnored(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		token: CancellationToken,
	): Promise<boolean> {
		const provider = this.#ignoredFileProviders.get(handle);
		if (!provider) {
			this._logError(
				`$isFileIgnored: Unknown LanguageModelIgnoredFileProvider Handle ${handle}.`,
			);
			throw new Error("Unknown LanguageModelIgnoredFileProvider handle.");
		}
		const uri = VscodeApiUri.from(URI.revive(uriComponents)); // Revive to internal URI, then convert to API URI
		return (await provider.provideFileIgnored(uri, token)) ?? false; // Default to false if provider returns undefined
	}

	/** Disposes of resources held by this service. */
	public override dispose(): void {
		super.dispose(); // Handles _instanceDisposables
		this.#onDidChangeProvidersEmitter.dispose();
		this.#onDidChangeModelAccessEmitter.dispose();
		this.#pendingChatRequests.forEach((pending) =>
			pending.responseStream.reject(
				new Error("Language Model Service disposed."),
			),
		);
		this.#pendingChatRequests.clear();
		this.#localProviders.clear();
		this.#allLanguageModelsData.clear();
		this.#ignoredFileProviders.clear();
		this._log("Disposed.");
	}
}
