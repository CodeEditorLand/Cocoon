/*---------------------------------------------------------------------------------------------
 * Cocoon Language Models Shim (language-models-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements `IExtHostLanguageModels` (based on VS Code's `ExtHostLanguageModels.ts`),
 *
 *
 * managing language model access and interactions for extensions.
 *
 * For Cocoon's MVP, this shim focuses on:
 * - Providing a more accurate `createLanguageModelAccessInformation()`.
 * - Defining the correct RPC shapes for communication with `MainThreadLanguageModels`.
 * - Stubbing the complex logic for provider registration, request streaming, and auth.
 *
 * This shim needs to be significantly expanded for full language model functionality.
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
	type IDisposable,
	toDisposable,
} from "vs/base/common/lifecycle";
// For internal URI handling
import { URI, UriComponents } from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	ExtensionIdentifierMap,
	ExtensionIdentifierSet,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// For Progress<T> type
import { Progress } from "vs/platform/progress/common/progress";
import {
	// RPC Contexts
	ExtHostContext,
	// The RPC interface this service implements (calls from MainThread)
	type ExtHostLanguageModelsShape,
	MainContext,
	// The RPC interface for calling MainThread
	type MainThreadLanguageModelsShape,
	// DTOs from protocol - these should be used for RPC if defined
	type IChatMessage as RpcChatMessage,
	type IChatResponseFragment as RpcChatResponseFragment,
	type ILanguageModelChatMetadata as RpcLanguageModelChatMetadata,
	type ILanguageModelsChangeEvent as RpcLanguageModelsChangeEvent,
	// TODO: Add other DTOs used by Main/ExtHostLanguageModelsShape
} from "vs/workbench/api/common/extHost.protocol";
// Dependency for auth hack
import type { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication";
// For type conversions
import * as typeConvert from "vs/workbench/api/common/extHostTypeConverters";
// For LanguageModelError etc.
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import {
	type ChatImageMimeType,
	IChatResponsePart,
} from "vs/workbench/contrib/chat/common/languageModels";
// For types used in streaming

import { DEFAULT_MODEL_PICKER_CATEGORY } from "vs/workbench/contrib/chat/common/modelPicker/modelPickerWidget";
// For auth hack
import { INTERNAL_AUTH_PROVIDER_PREFIX } from "vs/workbench/services/authentication/common/authentication";
// For proposed API checks
import { checkProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions";

import {
	type CancellationToken as VscodeCancellationToken,
	type ChatResponseProvider as VscodeChatResponseProvider,
	type ChatResponseProviderMetadata as VscodeChatResponseProviderMetadata,
	// vscode API types
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	type LanguageModelChat as VscodeLanguageModelChat,
	// Note the '2'
	type LanguageModelChatMessage2 as VscodeLanguageModelChatMessage2,
	LanguageModelChatMessageRole as VscodeLanguageModelChatMessageRole,
	type LanguageModelChatRequestOptions as VscodeLanguageModelChatRequestOptions,
	type LanguageModelChatResponse as VscodeLanguageModelChatResponse,
	type LanguageModelChatSelector as VscodeLanguageModelChatSelector,
	// Added
	type LanguageModelDataPart as VscodeLanguageModelDataPart,
	LanguageModelError as VscodeLanguageModelError,
	// Added
	type LanguageModelIgnoredFileProvider as VscodeLanguageModelIgnoredFileProvider,
	type LanguageModelTextPart as VscodeLanguageModelTextPart,
	// Added
	type LanguageModelToolCallPart as VscodeLanguageModelToolCallPart,
	// TODO: Add other vscode types if needed (e.g., ChatResponseFragment2)
} from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
	refineError,
} from "./_baseShim";

// --- Type Definitions based on ExtHostLanguageModels.ts ---

type LanguageModelProviderData = {
	// The short ID given by the extension
	readonly languageModelId: string;

	readonly extension: ExtensionIdentifier;

	readonly provider: VscodeChatResponseProvider;

	// Store full metadata
	readonly metadata: VscodeChatResponseProviderMetadata;
};

// Structure for _allLanguageModelData (all models known from main thread)
interface AllLanguageModelEntry {
	// DTO from main thread
	metadata: RpcLanguageModelChatMetadata;

	// Cache of API objects per requesting extension
	apiObjects: ExtensionIdentifierMap<VscodeLanguageModelChat>;
}

// For streaming responses
class LanguageModelResponseStreamShim {
	readonly stream = new AsyncIterableSource<
		| VscodeLanguageModelTextPart
		| VscodeLanguageModelToolCallPart
		| VscodeLanguageModelDataPart
	>();

	constructor(
		// Corresponds to fragment.index
		readonly optionIndex: number,

		// If this is the first/default stream, it can be pre-assigned by LanguageModelResponseShim
		preassignedStream?: AsyncIterableSource<
			| VscodeLanguageModelTextPart
			| VscodeLanguageModelToolCallPart
			| VscodeLanguageModelDataPart
		>,
	) {
		this.stream =
			preassignedStream ||
			new AsyncIterableSource<
				| VscodeLanguageModelTextPart
				| VscodeLanguageModelToolCallPart
				| VscodeLanguageModelDataPart
			>();
	}
}

class LanguageModelResponseShim {
	readonly apiObject: VscodeLanguageModelChatResponse;

	private readonly _responseStreams = new Map<
		number,
		LanguageModelResponseStreamShim
	>();

	// The primary stream
	private readonly _defaultStream: LanguageModelResponseStreamShim;

	private _isDone = false;

	constructor() {
		// Default stream for index 0 or first one
		this._defaultStream = new LanguageModelResponseStreamShim(0);

		// Ensure default stream is in map if index 0 is used
		this._responseStreams.set(0, this._defaultStream);

		const that = this;

		this.apiObject = {
			get stream() {
				return that._defaultStream.stream.asyncIterable;
			},

			get text() {
				// Concatenate all text parts from the default stream
				return AsyncIterableObject.map(
					that._defaultStream.stream.asyncIterable,

					(part) =>
						part instanceof extHostTypes.LanguageModelTextPart
							? part.value
							: undefined,
				).coalesce();
			},

			// TODO: Implement other properties like `result`, `error` on VscodeLanguageModelChatResponse if they exist
		};
	}

	private *_getUsedStreams() {
		// Iterate over streams that have received data or the default
		if (this._responseStreams.size > 0) {
			for (const streamHolder of this._responseStreams.values())
				yield streamHolder.stream;
		} else {
			// Should ideally not happen if constructor sets one
			yield this._defaultStream.stream;
		}
	}

	handleFragment(fragmentDto: RpcChatResponseFragment): void {
		// fragmentDto from main thread
		if (this._isDone) return;

		let streamHolder = this._responseStreams.get(fragmentDto.index);

		if (!streamHolder) {
			// If this is the first fragment for a new index AND the default stream hasn't been "claimed" by index 0
			if (
				fragmentDto.index !== 0 &&
				this._responseStreams.get(0) === this._defaultStream &&
				this._defaultStream.stream.isEmpty()
			) {
				// If index 0 was default but unused, and now a different index fragment arrives first,

				// we might re-assign the default stream or just create a new one.
				// VS Code's logic might be more nuanced here about which stream is "default".
				// For simplicity, let's always create a new stream if index doesn't match an existing one.
				streamHolder = new LanguageModelResponseStreamShim(
					fragmentDto.index,
				);
			} else if (
				fragmentDto.index === 0 &&
				!this._responseStreams.has(0)
			) {
				// This case means index 0 came but defaultStream wasn't in map, re-add
				streamHolder = this._defaultStream;
			} else {
				streamHolder = new LanguageModelResponseStreamShim(
					fragmentDto.index,
				);
			}

			this._responseStreams.set(fragmentDto.index, streamHolder);
		}

		// Convert RpcChatResponseFragment.part to vscode API part type
		let apiPart:
			| VscodeLanguageModelTextPart
			| VscodeLanguageModelToolCallPart
			| VscodeLanguageModelDataPart;

		if (fragmentDto.part.type === "text") {
			apiPart = new extHostTypes.LanguageModelTextPart(
				fragmentDto.part.value,
			);
		} else if (fragmentDto.part.type === "data") {
			// Assuming 'data' type for images
			// RpcChatResponseFragment.part for data: { type: 'data', value: { mimeType: ChatImageMimeType, data: VSBuffer } }

			const dataPartPayload = fragmentDto.part.value as {
				mimeType: ChatImageMimeType;

				data: VSBuffer;
			};

			apiPart = new extHostTypes.LanguageModelDataPart(
				dataPartPayload.data.buffer,

				dataPartPayload.mimeType,
			);
		} else if (fragmentDto.part.type === "tool_use") {
			// Assuming 'tool_use' type
			// Cast from IChatResponsePart
			const toolPartPayload = fragmentDto.part as any;

			apiPart = new extHostTypes.LanguageModelToolCallPart(
				// Ensure toolCallId
				toolPartPayload.toolCallId || `tool_${Date.now()}`,

				// Ensure name
				toolPartPayload.name || "",

				// Ensure parameters
				toolPartPayload.parameters || {},
			);
		} else {
			console.warn(
				`[LM Shim] Unknown fragment part type: ${fragmentDto.part.type}`,
			);

			// Skip unknown parts
			return;
		}

		streamHolder.stream.emitOne(apiPart);
	}

	reject(err: Error): void {
		this._isDone = true;

		for (const stream of this._getUsedStreams()) stream.reject(err);
	}

	resolve(): void {
		this._isDone = true;

		for (const stream of this._getUsedStreams()) stream.resolve();
	}
}

export class ShimExtHostLanguageModels
	extends BaseCocoonShim
	implements IExtHostLanguageModelsService, ExtHostLanguageModelsShape
{
	public readonly _serviceBrand: undefined;

	// Handles for registered providers
	private static _providerHandlePool = 1;

	readonly #proxy: MainThreadLanguageModelsShape | null = null;

	readonly #onDidChangeProvidersEmitter = new VscodeEmitter<void>();

	public readonly onDidChangeProviders: VscodeEvent<void> =
		this.#onDidChangeProvidersEmitter.event;

	// Stores providers registered by extensions in this ExtHost
	readonly #localProviders = new Map<number, LanguageModelProviderData>();

	// Stores metadata for ALL models known in the system (from MainThread)
	// Key: full model ID
	readonly #allLanguageModelsData = new Map<string, AllLanguageModelEntry>();

	// Stores access grants: Map<requestingExtId, Set<providingExtId>>
	readonly #modelAccessList =
		new ExtensionIdentifierMap<ExtensionIdentifierSet>();

	// Tracks extensions that created LanguageModelAccessInformation to notify them
	readonly #languageAccessInformationRequestingExtensions = new Set<
		Readonly<IExtensionDescription>
	>();

	readonly #onDidChangeModelAccessEmitter = new VscodeEmitter<{
		from: ExtensionIdentifier;

		to: ExtensionIdentifier;

		// Internal event
	}>();

	// Stores pending requests from extensions to language models
	readonly #pendingChatRequests = new Map<
		number,
		{ languageModelId: string; responseStream: LanguageModelResponseShim }

		// Key: requestId
	>();

	#chatRequestIdPool = 0;

	// For ignored file providers
	readonly #ignoredFileProviders = new Map<
		number,
		VscodeLanguageModelIgnoredFileProvider
	>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,

		// TODO: Inject IExtHostAuthentication if the auth hack needs to be fully implemented.
		private readonly _extHostAuthentication?: IExtHostAuthentication,
	) {
		super("ExtHostLanguageModels", rpcService, logService);

		this._log("Initializing Language Models Shim...");

		if (this._rpcService) {
			this.#proxy = this._getProxy(
				MainContext.MainThreadLanguageModels as ProxyIdentifier<MainThreadLanguageModelsShape>,
			);

			try {
				this._rpcService.set(
					ExtHostContext.ExtHostChatProvider as ProxyIdentifier<ExtHostLanguageModelsShape>,

					this,

					// VS Code uses ExtHostChatProvider
				);

				this._log(
					"Registered self for RPC calls (ExtHostLanguageModels/ChatProvider).",
				);
			} catch (e: any) {
				this._logError("Failed to set self for RPC:", e);
			}
		}

		if (!this.#proxy)
			this._logWarn(
				"MainThreadLanguageModels proxy not available. LM features will be non-functional.",
			);

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
							// This specific extension's access to 'to' might have changed.
							// The onDidChange event on LanguageModelAccessInformation needs to fire.
							// This requires LanguageModelAccessInformation to hold its own emitter.
							// For simplicity, the current LMAI.onDidChange is VscodeEvent.None.
							// TODO: Implement individual LMAI.onDidChange emitters.
						}
					},
				);
			}),
		);
	}

	// --- vscode.lm.* API implementation (called by extensions) ---

	public registerChatResponseProvider(
		extension: IExtensionDescription,

		// Model ID within the extension
		identifier: string,

		provider: VscodeChatResponseProvider,

		metadata: VscodeChatResponseProviderMetadata,
	): IDisposable {
		const handle = ShimExtHostLanguageModels._providerHandlePool++;

		this.#localProviders.set(handle, {
			extension: extension.identifier,

			provider,

			languageModelId: identifier,

			metadata,
		});

		// Globally unique model ID
		const fullModelId = `${extension.identifier.value}/${identifier}`;

		// TODO: Convert metadata to RpcLanguageModelChatMetadata DTO if necessary.
		// Assuming VscodeChatResponseProviderMetadata is compatible or parts are extracted.
		const rpcMetadata: RpcLanguageModelChatMetadata = {
			extension: extension.identifier,

			// Short ID
			id: identifier,

			// Default vendor to ext publisher
			vendor: metadata.vendor ?? extension.identifier.value,

			// Default to empty if not provided
			name: metadata.name ?? "",

			// Can be undefined
			version: metadata.version,

			family: metadata.family,

			maxInputTokens: metadata.maxInputTokens,

			maxOutputTokens: metadata.maxOutputTokens,

			auth: metadata.auth
				? {
						// Convert auth options if structure differs
						providerLabel: extension.displayName || extension.name,

						accountLabel:
							typeof metadata.auth === "object"
								? metadata.auth.label
								: undefined,
					}
				: undefined,

			targetExtensions: metadata.extensions?.map(
				(extId) => new ExtensionIdentifier(extId),

				// Convert string IDs to ExtensionIdentifier
			),

			isDefault: metadata.isDefault,

			isUserSelectable: metadata.isUserSelectable,

			modelPickerCategory:
				metadata.category ?? DEFAULT_MODEL_PICKER_CATEGORY,

			capabilities: metadata.capabilities
				? {
						vision: metadata.capabilities.vision,

						toolCalling: metadata.capabilities.toolCalling,

						chaining: metadata.capabilities.chaining,
					}
				: undefined,
		};

		this.#proxy
			?.$registerLanguageModelProvider(handle, fullModelId, rpcMetadata)
			.catch((e) =>
				this._logError(
					`RPC $registerLanguageModelProvider for ${fullModelId} failed:`,

					refineError(e, this._logService),
				),
			);

		// Handle onDidReceiveLanguageModelResponse2 for telemetry/logging
		const responseReceivedListener =
			provider.onDidReceiveLanguageModelResponse2?.(
				({ extensionId, participant, tokenCount }) => {
					this.#proxy?.$whenLanguageModelChatRequestMade(
						// The full model ID
						fullModelId,

						// Requesting extension
						new ExtensionIdentifier(extensionId),

						participant,

						tokenCount,
					);
				},
			);

		if (responseReceivedListener)
			this._instanceDisposables.add(responseReceivedListener);

		return toDisposable(() => {
			this.#localProviders.delete(handle);

			this.#proxy?.$unregisterProvider(handle).catch((e) =>
				this._logError(
					`RPC $unregisterProvider for handle ${handle} failed:`,

					refineError(e, this._logService),
				),
			);

			if (responseReceivedListener) responseReceivedListener.dispose();
		});
	}

	public async selectLanguageModels(
		extension: IExtensionDescription,

		selector: VscodeLanguageModelChatSelector,
	): Promise<VscodeLanguageModelChat[]> {
		this._log(
			`API selectLanguageModels by ${extension.identifier.value}, selector:`,

			selector,
		);

		if (!this.#proxy) {
			this._logError(
				"Cannot selectLanguageModels: MainThread proxy unavailable.",
			);

			return [];
		}

		try {
			// TODO: Convert VscodeLanguageModelChatSelector to DTO if protocol requires.
			const selectedModelIds = await this.#proxy.$selectChatModels({
				...selector,

				extension: extension.identifier,
			});

			const result: VscodeLanguageModelChat[] = [];

			for (const id of selectedModelIds) {
				const modelApi = this._createApiObjectForModel(extension, id);

				if (modelApi) result.push(modelApi);
			}

			return result;
		} catch (e) {
			this._logError(
				"RPC $selectChatModels failed:",

				refineError(e, this._logService),
			);

			return [];
		}
	}

	// This method would be part of the `vscode.lm` object that extensions use.
	public async sendChatRequest(
		// The extension making the request
		extension: IExtensionDescription,

		// Full model ID like 'publisher.name/modelShortId'
		modelId: string,

		requestMessages: VscodeLanguageModelChatMessage2[],

		options: VscodeLanguageModelChatRequestOptions,

		token: VscodeCancellationToken,
	): Promise<VscodeLanguageModelChatResponse> {
		// this._log(`API sendChatRequest from ${extension.identifier.value} to model ${modelId}`);

		const modelDataEntry = this.#allLanguageModelsData.get(modelId);

		if (!modelDataEntry)
			throw extHostTypes.LanguageModelError.NotFound(
				`Language model '${modelId}' is unknown.`,
			);

		// Access check (simplified from VS Code's _getAuthAccess)
		if (this._isAuthNeeded(extension.identifier, modelDataEntry.metadata)) {
			// TODO: Implement the auth flow similar to VS Code's _getAuthAccess
			// This involves checking this.#modelAccessList and potentially calling
			// this._extHostAuthentication.getSession if not already granted.
			// For MVP shim, assume access or always deny if auth needed.
			const hasAccess = this.#modelAccessList
				.get(extension.identifier)
				?.has(modelDataEntry.metadata.extension);

			if (!hasAccess) {
				this._logWarn(
					`Extension ${extension.identifier.value} does not have (or auth check stubbed) access to ${modelId}. Auth needed by ${modelDataEntry.metadata.extension.value}`,
				);

				throw extHostTypes.LanguageModelError.NoPermissions(
					`Access to language model '${modelId}' denied for extension '${extension.identifier.value}'.`,
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
			typeConvert.LanguageModelChatMessage2.from(m),
		);

		const serializedMessages = new SerializableObjectWithBuffers<
			RpcChatMessage[]
		>(rpcMessages);

		// CancellationToken handling: If the token is already cancelled, don't even make the RPC call.
		if (token.isCancellationRequested) {
			this.#pendingChatRequests.delete(requestId);

			responseShim.reject(new CancellationError());

			return responseShim.apiObject;
		}

		// TODO: If cancellation needs to be propagated to MainThread, the token needs to be marshalled (e.g. by ID)
		// and MainThread needs to observe it. For now, ExtHost cancellation stops further processing here.
		const unregisterTokenListener = token.onCancellationRequested(() => {
			const pending = this.#pendingChatRequests.get(requestId);

			if (pending) {
				pending.responseStream.reject(new CancellationError());

				this.#pendingChatRequests.delete(requestId);

				// TODO: Send $cancelChatRequest(requestId) to main thread if protocol supports it
			}
		});

		this.#proxy!.$tryStartChatRequest(
			extension.identifier,

			modelId,

			requestId,

			serializedMessages,

			options,

			undefined /* token ID */,
		).catch((err) => {
			const pending = this.#pendingChatRequests.get(requestId);

			if (pending) {
				pending.responseStream.reject(
					extHostTypes.LanguageModelError.tryDeserialize(err) ??
						transformErrorFromSerialization(err),
				);

				this.#pendingChatRequests.delete(requestId);
			}

			unregisterTokenListener.dispose();
		});

		return responseShim.apiObject;
	}

	private _createApiObjectForModel(
		requestingExtension: IExtensionDescription,

		modelId: string,
	): VscodeLanguageModelChat | undefined {
		const modelEntry = this.#allLanguageModelsData.get(modelId);

		if (!modelEntry) return undefined;

		let apiObject = modelEntry.apiObjects.get(
			requestingExtension.identifier,
		);

		if (!apiObject) {
			const metadata = modelEntry.metadata;

			apiObject = Object.freeze({
				// Ensure API object is immutable
				// This is the full ID from main thread like 'publisher.name/modelShortId'
				id: metadata.id,

				vendor: metadata.vendor,

				name: metadata.name,

				family: metadata.family,

				version: metadata.version,

				maxInputTokens: metadata.maxInputTokens,

				// maxOutputTokens is often on metadata directly, not part of VscodeLanguageModelChat
				get capabilities() {
					// Use getter for dynamic capabilities if they can change
					// TODO: Ensure VscodeLanguageModelChatCapabilities matches RpcLanguageModelChatMetadata.capabilities
					return Object.freeze({
						supportsImageToText: !!metadata.capabilities?.vision,

						supportsToolCalling:
							!!metadata.capabilities?.toolCalling,

						supportsChaining: !!metadata.capabilities?.chaining,
					});
				},

				countTokens: (
					textOrMessages:
						| string
						| VscodeLanguageModelChatMessage2
						| VscodeLanguageModelChatMessage2[],

					token = CancellationToken.None,
				): Promise<number> => {
					return this._countTokensForModel(
						modelId,

						textOrMessages,

						token,
					);
				},

				sendRequest: (
					messages: VscodeLanguageModelChatMessage2[],

					options?: VscodeLanguageModelChatRequestOptions,

					token = CancellationToken.None,
				): Promise<VscodeLanguageModelChatResponse> => {
					return this.sendChatRequest(
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

	private async _countTokensForModel(
		modelId: string,

		textOrMessages:
			| string
			| VscodeLanguageModelChatMessage2
			| VscodeLanguageModelChatMessage2[],

		token: VscodeCancellationToken,
	): Promise<number> {
		// this._log(`API countTokens for model ${modelId}`);

		// Check if the provider is local (registered in this ExtHost)
		const localProviderData = Iterable.find(
			this.#localProviders.values(),

			(p) => `${p.extension.value}/${p.languageModelId}` === modelId,
		);

		if (localProviderData?.provider.provideTokenCount) {
			try {
				// TODO: VS Code's extHostTypes.LanguageModelChatMessage is different from internal one.
				// Need to convert if `textOrMessages` contains API chat messages.
				// provider expects API type
				let inputForProvider: string | VscodeLanguageModelChatMessage2;

				if (typeof textOrMessages === "string") {
					inputForProvider = textOrMessages;
				} else if (Array.isArray(textOrMessages)) {
					// provideTokenCount typically takes one message or string, not array.
					// This scenario needs clarification from vscode.d.ts for LanguageModelChat.countTokens
					this._logWarn(
						"countTokens with array of messages for local provider not standard, using first message content or joining.",
					);

					inputForProvider = textOrMessages[0] || {
						role: VscodeLanguageModelChatMessageRole.User,

						content: "",

						// Default to first or empty
					};
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
					`Error in local provider provideTokenCount for ${modelId}:`,

					e,
				);

				// Rethrow
				throw e;
			}
		}

		// If not local, proxy to main thread
		if (!this.#proxy)
			throw new Error(
				"MainThreadLanguageModels proxy unavailable for countTokens.",
			);

		const rpcValue =
			typeof textOrMessages === "string"
				? textOrMessages
				: typeConvert.LanguageModelChatMessage2.from(
						Array.isArray(textOrMessages)
							? textOrMessages[0]
							: // RPC takes single message or string
								textOrMessages,
					);

		return this.#proxy.$countTokens(modelId, rpcValue, token);
	}

	// --- createLanguageModelAccessInformation (called by ExtHostExtensionService) ---
	public createLanguageModelAccessInformation(
		requestingExtension: IExtensionDescription,
	): VscodeLanguageModelAccessInformation {
		// this._log(`createLanguageModelAccessInformation for ${requestingExtension.identifier.value}`);

		this.#languageAccessInformationRequestingExtensions.add(
			requestingExtension,

			// Track who needs updates
		);

		return Object.freeze({
			// `accessAllowed` should ideally check #modelAccessList for *any* model the extension might want to use.
			// This is complex. VS Code's API has `canSendRequest(model)` on LMAI.
			// For a simple `accessAllowed` boolean, it might mean "has access to at least one model".
			get accessAllowed(): boolean {
				// For MVP, if any auth is configured for any model, this implies a check is needed.
				// A simple true/false based on general access would be a coarse approximation.
				// Let's default to true if no models require auth from this ext, else require specific grant.
				for (const modelEntry of this.#allLanguageModelsData.values()) {
					if (
						this._isAuthNeeded(
							requestingExtension.identifier,

							modelEntry.metadata,
						)
					) {
						if (
							!this.#modelAccessList
								.get(requestingExtension.identifier)
								?.has(modelEntry.metadata.extension)
						) {
							// console.log(`LMAI: ${requestingExtension.identifier.value} needs access to model from ${modelEntry.metadata.extension.value}`);

							// Needs specific grant for at least one model
							return false;
						}
					}
				}

				// Access granted or no models require specific auth from this ext
				return true;
			},

			// TODO: This onDidChange should fire when the result of `accessAllowed` might change
			// for this specific `requestingExtension`. This means listening to #onDidChangeModelAccessEmitter
			// and filtering for events relevant to `requestingExtension`.
			// Placeholder, requires more complex eventing
			onDidChange: VscodeEvent.None,
		});
	}

	// --- RPC methods called BY MainThread (ExtHostLanguageModelsShape) ---
	public $acceptChatModelMetadata(data: RpcLanguageModelsChangeEvent): void {
		// this._log(`RPC $acceptChatModelMetadata: Added=${data.added?.length}, Removed=${data.removed?.length}`);

		if (data.added) {
			for (const { identifier: fullModelId, metadata } of data.added) {
				this.#allLanguageModelsData.set(fullModelId, {
					metadata,

					apiObjects: new ExtensionIdentifierMap(),
				});

				// TODO: If auth is used, call _fakeAuthPopulate or similar to pre-check/establish sessions silently.
				// VS Code's original does this: data.added?.forEach(added => this._fakeAuthPopulate(added.metadata));
			}
		}

		if (data.removed) {
			for (const fullModelId of data.removed) {
				this.#allLanguageModelsData.delete(fullModelId);

				for (const [reqId, pending] of this.#pendingChatRequests) {
					if (pending.languageModelId === fullModelId) {
						pending.responseStream.reject(
							extHostTypes.LanguageModelError.NotFound(
								`Language model '${fullModelId}' was removed.`,
							),
						);

						this.#pendingChatRequests.delete(reqId);
					}
				}
			}
		}

		this.#onDidChangeProvidersEmitter.fire();
	}

	public $updateModelAccesslist(
		data: {
			from: ExtensionIdentifier;

			to: ExtensionIdentifier;

			enabled: boolean;
		}[],
	): void {
		// this._log(`RPC $updateModelAccesslist: ${data.length} entries`);

		for (const { from, to, enabled } of data) {
			let set = this.#modelAccessList.get(from);

			if (!set) {
				// No need to create set for a disable if it doesn't exist
				if (!enabled) continue;

				set = new ExtensionIdentifierSet();

				this.#modelAccessList.set(from, set);
			}

			const changed = enabled ? set.add(to) : set.delete(to);

			if (changed) this.#onDidChangeModelAccessEmitter.fire({ from, to });
		}
	}

	public async $provideLanguageModelResponse(
		// In VS Code, this is not used, requestId is primary key for pending.
		_chatHandle: number,

		requestId: number,

		// DTO from extHost.protocol
		responseDto: RpcChatResponseFragment,

		// This indicates end of stream for this request
		isLast: boolean,
	): Promise<void> {
		// this._log(`RPC $provideLanguageModelResponse for requestId ${requestId}, IsLast: ${isLast}`);

		const pending = this.#pendingChatRequests.get(requestId);

		if (pending) {
			try {
				pending.responseStream.handleFragment(responseDto);

				if (isLast) {
					pending.responseStream.resolve();

					this.#pendingChatRequests.delete(requestId);
				}
			} catch (e: any) {
				this._logError(
					`Error handling fragment for requestId ${requestId}:`,

					e,
				);

				pending.responseStream.reject(
					new Error(
						`Failed to process response fragment: ${e.message}`,
					),
				);

				this.#pendingChatRequests.delete(requestId);
			}
		} else {
			this._logWarn(
				`Received response for unknown/completed requestId: ${requestId}`,
			);
		}
	}

	public async $provideTokenLength(
		handle: number,

		valueOrMessageDto: string | RpcChatMessage,

		token: CancellationToken,
	): Promise<number> {
		const providerData = this.#localProviders.get(handle);

		if (!providerData?.provider.provideTokenCount) {
			this._logError(
				`No provideTokenCount for local provider handle ${handle}`,
			);

			throw new Error("Provider does not support token counting.");
		}

		// Convert RpcChatMessage DTO back to vscode.LanguageModelChatMessage2
		let apiValue: string | VscodeLanguageModelChatMessage2;

		if (typeof valueOrMessageDto === "string") {
			apiValue = valueOrMessageDto;
		} else {
			apiValue =
				typeConvert.LanguageModelChatMessage2.to(valueOrMessageDto);
		}

		return providerData.provider.provideTokenCount(apiValue, token);
	}

	// --- Auth "Hack" related (simplified from VS Code) ---
	private _isAuthNeeded(
		requestingExtensionId: ExtensionIdentifier,

		modelOwnerMetadata: RpcLanguageModelChatMetadata,
	): modelOwnerMetadata is RpcLanguageModelChatMetadata & {
		auth: NonNullable<RpcLanguageModelChatMetadata["auth"]>;
	} {
		return (
			!!modelOwnerMetadata.auth &&
			!ExtensionIdentifier.equals(
				modelOwnerMetadata.extension,

				requestingExtensionId,
			)
		);
	}

	// _fakeAuthPopulate and _getAuthAccess would require IExtHostAuthentication. For shim, these are complex.

	// --- Ignored File Provider Logic ---
	public registerIgnoredFileProvider(
		extension: IExtensionDescription,

		provider: VscodeLanguageModelIgnoredFileProvider,
	): IDisposable {
		// Check proposed API
		checkProposedApiEnabled(extension, "chatParticipantPrivate");

		const handle = ShimExtHostLanguageModels._providerHandlePool++;

		this.#proxy?.$registerFileIgnoreProvider(handle);

		this.#ignoredFileProviders.set(handle, provider);

		return toDisposable(() => {
			this.#proxy?.$unregisterFileIgnoreProvider(handle);

			this.#ignoredFileProviders.delete(handle);
		});
	}

	public async $isFileIgnored(
		handle: number,

		uriComponents: VSCodeInternalUriComponents,

		token: CancellationToken,
	): Promise<boolean> {
		const provider = this.#ignoredFileProviders.get(handle);

		if (!provider)
			throw new Error("Unknown LanguageModelIgnoredFileProvider handle.");

		const uri = VscodeApiUri.from(VSCodeInternalURI.revive(uriComponents));

		return (await provider.provideFileIgnored(uri, token)) ?? false;
	}

	public dispose(): void {
		// From BaseCocoonShim if it has one
		super.dispose();

		this._onDidRegisterExtensions.dispose();

		this._onDidChangeProviders.dispose();

		this.#onDidChangeModelAccessEmitter.dispose();

		this.#pendingChatRequests.forEach((p) =>
			p.responseStream.reject(
				new Error("Language Model Service disposed."),
			),
		);

		this.#pendingChatRequests.clear();

		this._log("Disposed.");
	}
}
