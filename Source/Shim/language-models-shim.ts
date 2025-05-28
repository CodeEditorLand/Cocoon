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
 * - **Type Conversion (CRITICAL):** The conversion between VS Code API types (e.g., `VscodeLanguageModelChatMessage2`
 *   with its rich content parts like tool calls and data buffers) and RPC DTOs
 *   (e.g., `RpcChatMessage`) is currently STUBBED or SIMPLIFIED in `localApiTypeConverters`.
 *   A full, robust implementation of these converters in `cocoon-type-converters.ts` is critical.
 * - **Authentication:** Authentication flows beyond a basic access list check are simplified.
 *   Full integration with `IExtHostAuthentication` for obtaining sessions is a TODO.
 * - **Advanced Features:** Complex error handling, detailed model capabilities reporting, *   and advanced request options (like tools, variables, agent participants beyond simple
 *   messages) are largely stubbed or not fully supported.
 *
 * Key Interactions:
 * - Registered with DI as `IExtHostLanguageModels`.
 * - `vscode.lm` API delegates its calls to this service instance.
 * - Communicates extensively with `MainContext.MainThreadLanguageModels` on Mountain via RPC.
 * - Is an RPC service target for `ExtHostContext.ExtHostChatProvider` calls from Mountain.
 * - May interact with `IExtHostAuthentication` service for access control.
 * - Uses `BaseCocoonShim` for common utilities.
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
	transformErrorFromSerialization,
} from "vs/base/common/errors";
// Removed transformErrorForSerialization as it's not used here
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
import { URI, type UriComponents } from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	ExtensionIdentifierMap,
	ExtensionIdentifierSet,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	MainContext,
	SerializableObjectWithBuffers,
	type ExtHostLanguageModelsShape,
	type MainThreadLanguageModelsShape,
	type IChatMessage as RpcChatMessage,
	type IChatResponseFragment as RpcChatResponseFragment,
	type ILanguageModelChatMetadata as RpcLanguageModelChatMetadata,
	type ILanguageModelsChangeEvent as RpcLanguageModelsChangeEvent,
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes"; // For API type constructors
import type { ChatRequestTextPart } from "vs/workbench/contrib/chat/common/chatRequestParser";
import type { IChatResponsePart } from "vs/workbench/contrib/chat/common/languageModels";
import { DEFAULT_MODEL_PICKER_CATEGORY } from "vs/workbench/contrib/chat/common/modelPicker/modelPickerWidget";
import { INTERNAL_AUTH_PROVIDER_PREFIX } from "vs/workbench/services/authentication/common/authentication";
import { checkProposedApiEnabled } from "vs/workbench/services/extensions/common/extensions"; // For proposed API checks

import {
	LanguageModelChatMessageRole as VscodeLanguageModelChatMessageRole,
	LanguageModelError as VscodeLanguageModelError,
	type CancellationToken as VscodeCancellationToken,
	type ChatResponseProvider as VscodeChatResponseProvider,
	type ChatResponseProviderMetadata as VscodeChatResponseProviderMetadata,
	type LanguageModelAccessInformation as VscodeLanguageModelAccessInformation,
	type LanguageModelChat as VscodeLanguageModelChat,
	type LanguageModelChatMessage2 as VscodeLanguageModelChatMessage2,
	type LanguageModelChatRequestOptions as VscodeLanguageModelChatRequestOptions,
	type LanguageModelChatResponse as VscodeLanguageModelChatResponse,
	type LanguageModelChatResponsePart as VscodeLanguageModelChatResponsePart,
	type LanguageModelChatSelector as VscodeLanguageModelChatSelector,
	type LanguageModelIgnoredFileProvider as VscodeLanguageModelIgnoredFileProvider,
} from "vscode";

// API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// TODO: CRITICAL - Import and use converters from `../cocoon-type-converters`
// import * as CocoonTypeConverters from '../cocoon-type-converters';

// --- Placeholder for Full extHostTypeConverters for Language Model Types ---
// TODO: CRITICAL - Replace these stubs with actual, robust converters in `cocoon-type-converters.ts`.
const localApiTypeConverters = {
	/* ... (stubs from original file, to be replaced) ... */
	LanguageModelChatMessage2: {
		fromApiType: (
			message: VscodeLanguageModelChatMessage2,
		): RpcChatMessage => {
			// STUBBED/SIMPLIFIED CONVERSION - Needs full implementation for all parts
			console.warn(
				"[TypeConverter LM STUB] LanguageModelChatMessage2.fromApiType is STUBBED.",
			);
			let rpcContent: string | any[] = "";
			if (typeof message.content === "string")
				rpcContent = message.content;
			else if (Array.isArray(message.content))
				rpcContent = message.content.map((p) => ({
					type: "text",
					text: (p as any).value || "[unsupported API part]",
				}));
			return {
				role:
					message.role === VscodeLanguageModelChatMessageRole.User
						? 0
						: 1,
				content: rpcContent,
				name: message.name,
			} as RpcChatMessage;
		},
		toApiType: (dto: RpcChatMessage): VscodeLanguageModelChatMessage2 => {
			// STUBBED/SIMPLIFIED CONVERSION - Needs full implementation
			console.warn(
				"[TypeConverter LM STUB] LanguageModelChatMessage2.toApiType is STUBBED.",
			);
			let apiContent: string | VscodeLanguageModelChatResponsePart[] = "";
			if (typeof dto.content === "string") apiContent = dto.content;
			else if (Array.isArray(dto.content))
				apiContent = (dto.content as any[]).map(
					(p) =>
						new extHostTypes.LanguageModelTextPart(
							p.text || "[unsupported DTO part]",
						),
				);
			return new extHostTypes.LanguageModelChatMessage(
				dto.role === 0
					? VscodeLanguageModelChatMessageRole.User
					: VscodeLanguageModelChatMessageRole.System,
				apiContent,
				dto.name,
			) as VscodeLanguageModelChatMessage2;
		},
	},
};

type LanguageModelProviderData = {
	readonly languageModelId: string;
	readonly extension: ExtensionIdentifier;
	readonly provider: VscodeChatResponseProvider;
	readonly metadata: VscodeChatResponseProviderMetadata;
};
interface AllLanguageModelEntry {
	metadata: RpcLanguageModelChatMetadata;
	apiObjects: ExtensionIdentifierMap<VscodeLanguageModelChat>;
}

class LanguageModelResponseStreamShim {
	readonly stream: AsyncIterableSource<VscodeLanguageModelChatResponsePart>;
	constructor(
		readonly optionIndex: number,
		preassignedStream?: AsyncIterableSource<VscodeLanguageModelChatResponsePart>,
	) {
		this.stream =
			preassignedStream ||
			new AsyncIterableSource<VscodeLanguageModelChatResponsePart>();
	}
}

class LanguageModelResponseShim {
	readonly apiObject: VscodeLanguageModelChatResponse;
	private readonly _responseStreams = new Map<
		number,
		LanguageModelResponseStreamShim
	>();
	private readonly _defaultStream: LanguageModelResponseStreamShim;
	private _isDone = false;

	constructor() {
		this._defaultStream = new LanguageModelResponseStreamShim(0);
		this._responseStreams.set(0, this._defaultStream);
		const that = this;
		this.apiObject = Object.freeze({
			get stream() {
				return that._defaultStream.stream.asyncIterable;
			},
			get text() {
				return AsyncIterableObject.map(
					that._defaultStream.stream.asyncIterable,
					(part) =>
						part instanceof extHostTypes.LanguageModelTextPart
							? part.value
							: undefined,
				).coalesce();
			},
		});
	}
	private *_getActiveStreamSources(): Iterable<
		AsyncIterableSource<VscodeLanguageModelChatResponsePart>
	> {
		if (this._responseStreams.size > 0) {
			for (const streamHolder of this._responseStreams.values())
				yield streamHolder.stream;
		} else {
			yield this._defaultStream.stream;
		}
	}
	handleFragment(fragmentDto: RpcChatResponseFragment): void {
		if (this._isDone) return;
		let streamHolder = this._responseStreams.get(fragmentDto.index);
		if (!streamHolder) {
			streamHolder = new LanguageModelResponseStreamShim(
				fragmentDto.index,
				this._responseStreams.size === 0
					? this._defaultStream
					: undefined,
			);
			this._responseStreams.set(fragmentDto.index, streamHolder);
		}
		// TODO: CRITICAL - Use CocoonTypeConverters.LanguageModelResponsePart.toApi(fragmentDto.part)
		let apiPart: VscodeLanguageModelChatResponsePart;
		const partDtoInternal = fragmentDto.part as IChatResponsePart; // Internal VS Code type
		if (
			partDtoInternal.kind === "text" &&
			typeof partDtoInternal.content.value === "string"
		) {
			apiPart = new extHostTypes.LanguageModelTextPart(
				partDtoInternal.content.value,
			);
		} else if (partDtoInternal.kind === "toolComamén") {
			// Protocol uses 'toolComamén'
			const toolUsePayload = partDtoInternal.content as {
				id?: string;
				name: string;
				input: string;
			}; // Adjust to actual DTO
			apiPart = new extHostTypes.LanguageModelToolCallPart(
				toolUsePayload.id || `tool_${Date.now()}`,
				toolUsePayload.name,
				JSON.parse(toolUsePayload.input || "{}"),
			);
		} else if (
			partDtoInternal.kind === "dataBuffer" &&
			partDtoInternal.content.data instanceof VSBuffer
		) {
			const dataPayload = partDtoInternal.content as {
				mimeType: string;
				data: VSBuffer;
			};
			apiPart = new extHostTypes.LanguageModelDataPart(
				dataPayload.data.buffer,
				dataPayload.mimeType,
			);
		} else {
			console.warn(
				`[LM ResponseShim] STUB: Unknown chat response fragment kind: '${partDtoInternal.kind}'. DTO:`,
				partDtoInternal,
			);
			apiPart = new extHostTypes.LanguageModelTextPart(
				"[Unsupported fragment part]",
			);
		}
		streamHolder.stream.emitOne(apiPart);
	}
	reject(err: Error): void {
		if (this._isDone) return;
		this._isDone = true;
		for (const s of this._getActiveStreamSources()) s.reject(err);
	}
	resolve(): void {
		if (this._isDone) return;
		this._isDone = true;
		for (const s of this._getActiveStreamSources()) s.resolve();
	}
}

export class ShimExtHostLanguageModels
	extends BaseCocoonShim
	implements ExtHostLanguageModelsShape
{
	public readonly _serviceBrand: undefined;
	private static _providerHandlePool = 1;
	readonly #mainThreadLmProxy: MainThreadLanguageModelsShape | null = null;
	readonly #onDidChangeProvidersEmitter = this._instanceDisposables.add(
		new VscodeEmitter<void>(),
	);
	public readonly onDidChangeProviders: VscodeEvent<void> =
		this.#onDidChangeProvidersEmitter.event;
	readonly #localProviders = new Map<number, LanguageModelProviderData>();
	readonly #allLanguageModelsData = new Map<string, AllLanguageModelEntry>();
	readonly #modelAccessList =
		new ExtensionIdentifierMap<ExtensionIdentifierSet>();
	readonly #languageAccessInformationRequestingExtensions = new Set<
		Readonly<IExtensionDescription>
	>();
	readonly #onDidChangeModelAccessEmitter = this._instanceDisposables.add(
		new VscodeEmitter<{
			from: ExtensionIdentifier;
			to: ExtensionIdentifier;
		}>(),
	);
	readonly #pendingChatRequests = new Map<
		number,
		{ languageModelId: string; responseStream: LanguageModelResponseShim }
	>();
	#chatRequestIdPool = 0;
	readonly #ignoredFileProviders = new Map<
		number,
		VscodeLanguageModelIgnoredFileProvider
	>();

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		private readonly _extHostAuthentication?: IExtHostAuthentication, // Optional for now
	) {
		super("ExtHostLanguageModels", rpcService, logService);
		this._logInfo("Initializing...");
		if (this._rpcService) {
			this.#mainThreadLmProxy = this._getProxy(
				MainContext.MainThreadLanguageModels as ProxyIdentifier<MainThreadLanguageModelsShape>,
			);
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostChatProvider as ProxyIdentifier<ExtHostLanguageModelsShape>,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from MainThread (ExtHostChatProvider for LM).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostChatProvider (LM):",
					e,
				);
			}
		}
		if (!this.#mainThreadLmProxy) {
			this._logWarn(
				"MainThreadLanguageModels RPC proxy unavailable. Most LM features will be impaired.",
			);
		}

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
							// TODO: If LanguageModelAccessInformation had its own onDidChange emitter,
							// it would check its accessAllowed status and fire if changed.
							this._logDebug(
								`Model access changed for ext '${e.from.value}' re: models from '${e.to.value}'. Related LMAI instances should update.`,
							);
						}
					},
				);
			}),
		);
	}

	public registerChatResponseProvider(
		extension: IExtensionDescription,
		identifier: string,
		provider: VscodeChatResponseProvider,
		metadata: VscodeChatResponseProviderMetadata,
	): IDisposable {
		const handle = ShimExtHostLanguageModels._providerHandlePool++;
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
		// TODO: Use CocoonTypeConverters for metadata to RpcLanguageModelChatMetadata
		const rpcMetadata: RpcLanguageModelChatMetadata = {
			extension: extension.identifier,
			id: identifier,
			vendor:
				metadata.vendor ??
				extension.publisher ??
				extension.identifier.value,
			name: metadata.name ?? identifier,
			version: metadata.version,
			family: metadata.family,
			maxInputTokens: metadata.maxInputTokens,
			maxOutputTokens: metadata.maxOutputTokens,
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
				(idStr) => new ExtensionIdentifier(idStr),
			),
			isDefault: metadata.isDefault,
			isUserSelectable: metadata.isUserSelectable !== false,
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
					`RPC $registerLanguageModelProvider for '${fullModelId}' failed:`,
					refineErrorForShim(
						e,
						this._logService,
						"$registerLanguageModelProvider RPC",
					),
				),
			);
		const responseListener = provider.onDidReceiveLanguageModelResponse2?.(
			({ extensionId, participant, tokenCount }) => {
				this.#mainThreadLmProxy?.$whenLanguageModelChatRequestMade(
					fullModelId,
					new ExtensionIdentifier(extensionId),
					participant,
					tokenCount,
				);
			},
		);
		if (responseListener) this._instanceDisposables.add(responseListener);
		return toDisposable(() => {
			this._logInfo(
				`Unregistering ChatResponseProvider: Handle=${handle}, FullID='${fullModelId}'`,
			);
			this.#localProviders.delete(handle);
			this.#mainThreadLmProxy
				?.$unregisterProvider(handle)
				.catch((e) =>
					this._logError(
						`RPC $unregisterProvider for Handle ${handle} failed:`,
						e,
					),
				);
			if (responseListener) responseListener.dispose();
		});
	}

	public async selectLanguageModels(
		extension: IExtensionDescription,
		selector: VscodeLanguageModelChatSelector,
	): Promise<VscodeLanguageModelChat[]> {
		this._logInfo(
			`API selectLanguageModels by Ext='${extension.identifier.value}', Selector=${JSON.stringify(selector)}`,
		);
		if (!this.#mainThreadLmProxy) {
			this._logError(
				"Cannot selectLanguageModels: MainThread RPC proxy unavailable.",
			);
			return [];
		}
		try {
			// TODO: Convert VscodeLanguageModelChatSelector (API) to protocol.ILanguageModelChatSelector (DTO) if they differ.
			const selectedIds = await this.#mainThreadLmProxy.$selectChatModels(
				{ ...selector, extension: extension.identifier },
			);
			const result: VscodeLanguageModelChat[] = [];
			for (const id of selectedIds) {
				const apiObj = this._createApiObjectForModel(extension, id);
				if (apiObj) result.push(apiObj);
			}
			this._logDebug(
				`selectLanguageModels for ext '${extension.identifier.value}' resolved ${result.length} models.`,
			);
			return result;
		} catch (e: any) {
			this._logError(
				"RPC $selectChatModels failed:",
				refineErrorForShim(
					e,
					this._logService,
					"$selectChatModels RPC",
				),
			);
			return [];
		}
	}

	public async sendChatRequest(
		requestingExtension: IExtensionDescription,
		modelId: string,
		requestMessages: VscodeLanguageModelChatMessage2[],
		options: VscodeLanguageModelChatRequestOptions,
		token: VscodeCancellationToken,
	): Promise<VscodeLanguageModelChatResponse> {
		this._logDebug(
			`API sendChatRequest from Ext='${requestingExtension.identifier.value}' to Model='${modelId}', Msgs=${requestMessages.length}`,
		);
		const modelDataEntry = this.#allLanguageModelsData.get(modelId);
		if (!modelDataEntry) {
			throw VscodeLanguageModelError.NotFound(
				`Model '${modelId}' unknown.`,
			);
		}

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
				// TODO: Implement full auth flow using this._extHostAuthentication.getSession(...)
				this._logWarn(
					`Auth Denied (STUB): Ext '${requestingExtension.identifier.value}' to model '${modelId}'. Full auth flow TODO.`,
				);
				throw VscodeLanguageModelError.NoPermissions(
					`Access to model '${modelId}' denied for ext '${requestingExtension.identifier.value}'.`,
				);
			}
		}

		const requestId = ++this.#chatRequestIdPool;
		const responseShim = new LanguageModelResponseShim();
		this.#pendingChatRequests.set(requestId, {
			languageModelId: modelId,
			responseStream: responseShim,
		});

		// TODO: CRITICAL - Use CocoonTypeConverters.LanguageModelChatMessage.fromApiArray(requestMessages)
		const rpcMessages: RpcChatMessage[] = requestMessages.map((m) =>
			localApiTypeConverters.LanguageModelChatMessage2.fromApiType(m),
		);
		const messagesPayload = this._wrapIfContainsBuffer(rpcMessages);

		if (token.isCancellationRequested) {
			this.#pendingChatRequests.delete(requestId);
			responseShim.reject(new CancellationError());
			return responseShim.apiObject;
		}
		const cancellationListener = token.onCancellationRequested(() => {
			const pending = this.#pendingChatRequests.get(requestId);
			if (pending) {
				pending.responseStream.reject(new CancellationError());
				this.#pendingChatRequests.delete(requestId);
				this.#mainThreadLmProxy
					?.$cancelChatRequest(requestId)
					.catch((e) =>
						this._logWarn(
							`Failed $cancelChatRequest for ${requestId}:`,
							e,
						),
					);
			}
		});
		const ensureListenerDisposed = () => cancellationListener.dispose();

		if (!this.#mainThreadLmProxy) {
			responseShim.reject(
				VscodeLanguageModelError.Internal("LM service unavailable."),
			);
			this.#pendingChatRequests.delete(requestId);
			ensureListenerDisposed();
			return responseShim.apiObject;
		}
		this.#mainThreadLmProxy
			.$tryStartChatRequest(
				requestingExtension.identifier,
				modelId,
				requestId,
				messagesPayload,
				options,
				undefined /* tokenID */,
			)
			.then(ensureListenerDisposed, (rpcError) => {
				const pending = this.#pendingChatRequests.get(requestId);
				if (pending) {
					const deserializedError =
						VscodeLanguageModelError.tryDeserialize(rpcError) ??
						transformErrorFromSerialization(rpcError);
					pending.responseStream.reject(deserializedError);
					this.#pendingChatRequests.delete(requestId);
				}
				ensureListenerDisposed();
			});
		return responseShim.apiObject;
	}

	private _wrapIfContainsBuffer<T>(
		data: T,
	): T | SerializableObjectWithBuffers<T> {
		/* ... (implementation from original file) ... */
		let containsBuffer = false;
		const checkItemForBuffer = (item: any): boolean => {
			if (VSBuffer.isVSBuffer(item)) return true;
			if (typeof item === "object" && item !== null) {
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

	private _createApiObjectForModel(
		requestingExtension: IExtensionDescription,
		modelId: string,
	): VscodeLanguageModelChat | undefined {
		/* ... (implementation from original file, uses `this.sendChatRequest` and `this._countTokensForModel`) ... */
		const modelEntry = this.#allLanguageModelsData.get(modelId);
		if (!modelEntry) return undefined;
		let apiObject = modelEntry.apiObjects.get(
			requestingExtension.identifier,
		);
		if (!apiObject) {
			const metadataFromRpc = modelEntry.metadata;
			const self = this;
			apiObject = Object.freeze({
				id: metadataFromRpc.id,
				vendor: metadataFromRpc.vendor,
				name: metadataFromRpc.name,
				family: metadataFromRpc.family,
				version: metadataFromRpc.version,
				maxInputTokens: metadataFromRpc.maxInputTokens,
				get capabilities() {
					return Object.freeze({
						vision: !!metadataFromRpc.capabilities?.vision,
						toolCalling:
							!!metadataFromRpc.capabilities?.toolCalling,
						chaining: !!metadataFromRpc.capabilities?.chaining,
					});
				},
				countTokens: (textOrMessages, token = CancellationToken.None) =>
					self._countTokensForModel(modelId, textOrMessages, token),
				sendRequest: (
					messages,
					options,
					token = CancellationToken.None,
				) =>
					self.sendChatRequest(
						requestingExtension,
						modelId,
						messages,
						options || {},
						token,
					),
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
		this._logDebug(`_countTokensForModel for Model='${modelId}'`);
		const localProviderData = Iterable.find(
			this.#localProviders.values(),
			(p) => `${p.extension.value}/${p.languageModelId}` === modelId,
		);
		if (localProviderData?.provider.provideTokenCount) {
			try {
				let inputForProvider: string | VscodeLanguageModelChatMessage2 =
					textOrMessages as any; // Temp cast
				if (Array.isArray(textOrMessages)) {
					this._logWarnOnce(
						`_countTokensForModel: Array of messages for local provider '${modelId}'. Counting first message only. Provider contract should clarify array handling.`,
					);
					if (textOrMessages.length === 0) return 0;
					inputForProvider = textOrMessages[0];
				}
				return await Promise.resolve(
					localProviderData.provider.provideTokenCount(
						inputForProvider,
						token,
					),
				);
			} catch (e: any) {
				this._logError(
					`Error in local provider.provideTokenCount for '${modelId}':`,
					e,
				);
				throw VscodeLanguageModelError.Internal(
					"Token counting failed in local provider.",
				);
			}
		}
		if (!this.#mainThreadLmProxy) {
			throw VscodeLanguageModelError.Internal(
				"LM service (MainThread proxy) unavailable for token counting.",
			);
		}
		// TODO: CRITICAL - Use CocoonTypeConverters for textOrMessages to DTO
		const rpcValueForCount =
			typeof textOrMessages === "string"
				? textOrMessages
				: localApiTypeConverters.LanguageModelChatMessage2.fromApiType(
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

	public createLanguageModelAccessInformation(
		requestingExtension: IExtensionDescription,
	): VscodeLanguageModelAccessInformation {
		this._logDebug(
			`Creating LMAI for ext: '${requestingExtension.identifier.value}'`,
		);
		this.#languageAccessInformationRequestingExtensions.add(
			requestingExtension,
		);
		const self = this;
		// TODO: Implement onDidChange for LMAI by filtering #onDidChangeModelAccessEmitter
		// and re-evaluating accessAllowed, firing if it changed.
		return Object.freeze({
			get accessAllowed(): boolean {
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
							return false; // Missing grant for at least one auth-needed model
						}
					}
				}
				return true; // All relevant models are granted or don't need specific auth from this ext
			},
			onDidChange: VscodeEvent.None, // STUBBED
		});
	}

	// --- RPC methods called BY MainThread ---
	public $acceptChatModelMetadata(data: RpcLanguageModelsChangeEvent): void {
		/* ... (implementation from original, seems okay) ... */
		this._logDebug(
			`RPC $acceptChatModelMetadata: Added=${data.added?.length ?? 0}, Removed=${data.removed?.length ?? 0}.`,
		);
		let changed = false;
		if (data.added) {
			for (const { identifier: id, metadata: rpcMeta } of data.added) {
				if (
					!this.#allLanguageModelsData.has(id) ||
					JSON.stringify(
						this.#allLanguageModelsData.get(id)?.metadata,
					) !== JSON.stringify(rpcMeta)
				) {
					this.#allLanguageModelsData.set(id, {
						metadata: rpcMeta,
						apiObjects: new ExtensionIdentifierMap(),
					});
					changed = true;
					this._logInfo(`Accepted/Updated metadata for LM '${id}'.`);
				}
			}
		}
		if (data.removed) {
			for (const id of data.removed) {
				if (this.#allLanguageModelsData.delete(id)) {
					changed = true;
					this._logInfo(`Removed metadata for LM '${id}'.`);
				}
				for (const [reqId, pending] of this.#pendingChatRequests) {
					if (pending.languageModelId === id) {
						pending.responseStream.reject(
							VscodeLanguageModelError.NotFound(
								`Model '${id}' removed.`,
							),
						);
						this.#pendingChatRequests.delete(reqId);
					}
				}
			}
		}
		if (changed) {
			this.#onDidChangeProvidersEmitter.fire();
		}
	}
	public $updateModelAccesslist(
		entries: {
			from: ExtensionIdentifier;
			to: ExtensionIdentifier;
			enabled: boolean;
		}[],
	): void {
		/* ... (implementation from original, seems okay) ... */
		this._logDebug(
			`RPC $updateModelAccesslist with ${entries.length} entries.`,
		);
		for (const { from, to, enabled } of entries) {
			let accessSet = this.#modelAccessList.get(from);
			if (!accessSet) {
				if (!enabled) continue;
				accessSet = new ExtensionIdentifierSet();
				this.#modelAccessList.set(from, accessSet);
			}
			let changed = enabled ? accessSet.add(to) : accessSet.delete(to);
			if (changed) {
				this._logInfo(
					`Model access from '${from.value}' to models by '${to.value}' set to: ${enabled}.`,
				);
				this.#onDidChangeModelAccessEmitter.fire({ from, to });
			}
		}
	}
	public async $provideLanguageModelResponse(
		_chatReqIdUnused: number,
		requestId: number,
		responseDto: RpcChatResponseFragment,
		isLast: boolean,
	): Promise<void> {
		/* ... (implementation from original, seems okay, uses LanguageModelResponseShim.handleFragment/resolve) ... */
		this._logDebug(
			`RPC $provideLanguageModelResponse for ReqID ${requestId}, OptIdx ${responseDto.index}, IsLast: ${isLast}`,
		);
		const pending = this.#pendingChatRequests.get(requestId);
		if (pending) {
			try {
				pending.responseStream.handleFragment(responseDto);
				if (isLast) {
					pending.responseStream.resolve();
					if (responseDto.index === 0) {
						/* Assuming index 0 is primary/only stream for request completion */ this.#pendingChatRequests.delete(
							requestId,
						);
						this._logDebug(
							`Chat request ID ${requestId} (model '${pending.languageModelId}') completed.`,
						);
					}
				}
			} catch (e: any) {
				this._logError(
					`Error handling response fragment for ReqID ${requestId}:`,
					e,
				);
				pending.responseStream.reject(
					new Error(
						`Failed to process response fragment: ${e.message || e}`,
					),
				);
				this.#pendingChatRequests.delete(requestId);
			}
		} else {
			this._logWarn(
				`Received response fragment for unknown/completed ReqID: ${requestId}.`,
			);
		}
	}
	public async $provideTokenLength(
		handle: number,
		valueOrMessageDto: string | RpcChatMessage,
		token: VscodeCancellationToken,
	): Promise<number> {
		/* ... (implementation from original, uses localApiTypeConverters stub) ... */
		const providerData = this.#localProviders.get(handle);
		if (!providerData?.provider.provideTokenCount) {
			this._logError(
				`RPC $provideTokenLength: No local provider for Handle ${handle} or no provideTokenCount.`,
			);
			throw new Error(
				"Provider does not support token counting or not found.",
			);
		}
		// TODO: CRITICAL - Use CocoonTypeConverters for DTO to API
		let apiValue: string | VscodeLanguageModelChatMessage2 =
			typeof valueOrMessageDto === "string"
				? valueOrMessageDto
				: localApiTypeConverters.LanguageModelChatMessage2.toApiType(
						valueOrMessageDto,
					);
		this._logDebug(
			`RPC $provideTokenLength: Invoking local provider (Handle ${handle})`,
		);
		try {
			return await Promise.resolve(
				providerData.provider.provideTokenCount(apiValue, token),
			);
		} catch (e: any) {
			this._logError(
				`Error in local provider.provideTokenCount (Handle ${handle}):`,
				e,
			);
			throw VscodeLanguageModelError.Internal(
				"Token counting by local provider failed via RPC.",
			);
		}
	}

	private _isAuthNeeded(
		reqExtId: ExtensionIdentifier,
		modelMeta: RpcLanguageModelChatMetadata,
	): modelMeta is RpcLanguageModelChatMetadata & {
		auth: NonNullable<RpcLanguageModelChatMetadata["auth"]>;
	} {
		/* ... (implementation from original, seems okay) ... */
		return (
			!!modelMeta.auth &&
			!ExtensionIdentifier.equals(modelMeta.extension, reqExtId) &&
			!modelMeta.extension.value.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)
		);
	}

	public registerIgnoredFileProvider(
		extension: IExtensionDescription,
		provider: VscodeLanguageModelIgnoredFileProvider,
	): IDisposable {
		checkProposedApiEnabled(
			extension,
			"languageModelIgnoredFiles" /* Placeholder proposal name */,
		);
		this._logWarnOnce(
			"API registerIgnoredFileProvider is using a placeholder proposed API name 'languageModelIgnoredFiles'.",
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
		this._logInfo(
			`Registered LanguageModelIgnoredFileProvider (Handle ${handle}) for ext '${extension.identifier.value}'.`,
		);
		return toDisposable(() => {
			this._logInfo(
				`Unregistering LanguageModelIgnoredFileProvider (Handle ${handle}) for ext '${extension.identifier.value}'.`,
			);
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
	public async $isFileIgnored(
		handle: number,
		uriComponents: VSCodeInternalUriComponents,
		token: VscodeCancellationToken,
	): Promise<boolean> {
		const provider = this.#ignoredFileProviders.get(handle);
		if (!provider) {
			this._logError(
				`RPC $isFileIgnored: Unknown provider Handle ${handle}.`,
			);
			throw new Error(
				`Unknown LM IgnoredFileProvider handle: ${handle}.`,
			);
		}
		// Convert UriComponents to VscodeApiUri using VSCodeInternalURI.revive then VscodeApiUri.from
		const apiUri = VscodeApiUri.from(URI.revive(uriComponents));
		this._logDebug(
			`RPC $isFileIgnored: Invoking local provider (Handle ${handle}) for URI '${apiUri.toString()}'.`,
		);
		try {
			return (await provider.provideFileIgnored(apiUri, token)) ?? false;
		} catch (e: any) {
			this._logError(
				`Error in local LMIgnoredFileProvider (Handle ${handle}) for URI '${apiUri.toString()}':`,
				e,
			);
			throw VscodeLanguageModelError.Internal(
				"File ignored check by local provider failed.",
			);
		}
	}

	public override dispose(): void {
		super.dispose(); // Handles emitters via _instanceDisposables
		this.#pendingChatRequests.forEach((p) =>
			p.responseStream.reject(new Error("LM Service disposed.")),
		);
		this.#pendingChatRequests.clear();
		this.#localProviders.clear();
		this.#allLanguageModelsData.clear();
		this.#modelAccessList.clear();
		this.#languageAccessInformationRequestingExtensions.clear();
		this.#ignoredFileProviders.clear();
		this._logInfo(
			"Disposed and cleared all LM provider data and pending requests.",
		);
	}
}
