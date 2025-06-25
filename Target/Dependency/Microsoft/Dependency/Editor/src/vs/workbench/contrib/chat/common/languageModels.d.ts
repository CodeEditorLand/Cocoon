import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
export declare const enum ChatMessageRole {
    System = 0,
    User = 1,
    Assistant = 2
}
export interface IChatMessageTextPart {
    type: 'text';
    value: string;
}
export interface IChatMessageImagePart {
    type: 'image_url';
    value: IChatImageURLPart;
}
export interface IChatMessageDataPart {
    type: 'data';
    mimeType: string;
    data: VSBuffer;
}
export interface IChatImageURLPart {
    /**
     * The image's MIME type (e.g., "image/png", "image/jpeg").
     */
    mimeType: ChatImageMimeType;
    /**
     * The raw binary data of the image, encoded as a Uint8Array. Note: do not use base64 encoding. Maximum image size is 5MB.
     */
    data: VSBuffer;
}
/**
 * Enum for supported image MIME types.
 */
export declare enum ChatImageMimeType {
    PNG = "image/png",
    JPEG = "image/jpeg",
    GIF = "image/gif",
    WEBP = "image/webp",
    BMP = "image/bmp"
}
/**
 * Specifies the detail level of the image.
 */
export declare enum ImageDetailLevel {
    Low = "low",
    High = "high"
}
export interface IChatMessageToolResultPart {
    type: 'tool_result';
    toolCallId: string;
    value: (IChatResponseTextPart | IChatResponsePromptTsxPart | IChatResponseDataPart)[];
    isError?: boolean;
}
export type IChatMessagePart = IChatMessageTextPart | IChatMessageToolResultPart | IChatResponseToolUsePart | IChatMessageImagePart | IChatMessageDataPart;
export interface IChatMessage {
    readonly name?: string | undefined;
    readonly role: ChatMessageRole;
    readonly content: IChatMessagePart[];
}
export interface IChatResponseTextPart {
    type: 'text';
    value: string;
}
export interface IChatResponsePromptTsxPart {
    type: 'prompt_tsx';
    value: unknown;
}
export interface IChatResponseDataPart {
    type: 'data';
    value: IChatImageURLPart;
}
export interface IChatResponseToolUsePart {
    type: 'tool_use';
    name: string;
    toolCallId: string;
    parameters: any;
}
export type IChatResponsePart = IChatResponseTextPart | IChatResponseToolUsePart | IChatResponseDataPart;
export interface IChatResponseFragment {
    index: number;
    part: IChatResponsePart;
}
export interface ILanguageModelChatMetadata {
    readonly extension: ExtensionIdentifier;
    readonly name: string;
    readonly id: string;
    readonly vendor: string;
    readonly version: string;
    readonly description?: string;
    readonly cost?: string;
    readonly family: string;
    readonly maxInputTokens: number;
    readonly maxOutputTokens: number;
    readonly targetExtensions?: string[];
    readonly isDefault?: boolean;
    readonly isUserSelectable?: boolean;
    readonly modelPickerCategory: {
        label: string;
        order: number;
    };
    readonly auth?: {
        readonly providerLabel: string;
        readonly accountLabel?: string;
    };
    readonly capabilities?: {
        readonly vision?: boolean;
        readonly toolCalling?: boolean;
        readonly agentMode?: boolean;
    };
}
export interface ILanguageModelChatResponse {
    stream: AsyncIterable<IChatResponseFragment | IChatResponseFragment[]>;
    result: Promise<any>;
}
export interface ILanguageModelChat {
    metadata: ILanguageModelChatMetadata;
    sendChatRequest(messages: IChatMessage[], from: ExtensionIdentifier, options: {
        [name: string]: any;
    }, token: CancellationToken): Promise<ILanguageModelChatResponse>;
    provideTokenCount(message: string | IChatMessage, token: CancellationToken): Promise<number>;
}
export interface ILanguageModelChatSelector {
    readonly name?: string;
    readonly id?: string;
    readonly vendor?: string;
    readonly version?: string;
    readonly family?: string;
    readonly tokens?: number;
    readonly extension?: ExtensionIdentifier;
}
export declare const ILanguageModelsService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ILanguageModelsService>;
export interface ILanguageModelChatMetadataAndIdentifier {
    metadata: ILanguageModelChatMetadata;
    identifier: string;
}
export interface ILanguageModelsChangeEvent {
    added?: ILanguageModelChatMetadataAndIdentifier[];
    removed?: string[];
}
export interface ILanguageModelsService {
    readonly _serviceBrand: undefined;
    onDidChangeLanguageModels: Event<ILanguageModelsChangeEvent>;
    getLanguageModelIds(): string[];
    lookupLanguageModel(identifier: string): ILanguageModelChatMetadata | undefined;
    selectLanguageModels(selector: ILanguageModelChatSelector): Promise<string[]>;
    registerLanguageModelChat(identifier: string, provider: ILanguageModelChat): IDisposable;
    sendChatRequest(identifier: string, from: ExtensionIdentifier, messages: IChatMessage[], options: {
        [name: string]: any;
    }, token: CancellationToken): Promise<ILanguageModelChatResponse>;
    computeTokenLength(identifier: string, message: string | IChatMessage, token: CancellationToken): Promise<number>;
}
interface IUserFriendlyLanguageModel {
    vendor: string;
}
export declare const languageModelExtensionPoint: import("../../../services/extensions/common/extensionsRegistry.js").IExtensionPoint<IUserFriendlyLanguageModel | IUserFriendlyLanguageModel[]>;
export declare class LanguageModelsService implements ILanguageModelsService {
    private readonly _extensionService;
    private readonly _logService;
    private readonly _contextKeyService;
    readonly _serviceBrand: undefined;
    private readonly _store;
    private readonly _providers;
    private readonly _vendors;
    private readonly _onDidChangeProviders;
    readonly onDidChangeLanguageModels: Event<ILanguageModelsChangeEvent>;
    private readonly _hasUserSelectableModels;
    constructor(_extensionService: IExtensionService, _logService: ILogService, _contextKeyService: IContextKeyService);
    dispose(): void;
    getLanguageModelIds(): string[];
    lookupLanguageModel(identifier: string): ILanguageModelChatMetadata | undefined;
    selectLanguageModels(selector: ILanguageModelChatSelector): Promise<string[]>;
    registerLanguageModelChat(identifier: string, provider: ILanguageModelChat): IDisposable;
    private updateUserSelectableModelsContext;
    sendChatRequest(identifier: string, from: ExtensionIdentifier, messages: IChatMessage[], options: {
        [name: string]: any;
    }, token: CancellationToken): Promise<ILanguageModelChatResponse>;
    computeTokenLength(identifier: string, message: string | IChatMessage, token: CancellationToken): Promise<number>;
}
export {};
