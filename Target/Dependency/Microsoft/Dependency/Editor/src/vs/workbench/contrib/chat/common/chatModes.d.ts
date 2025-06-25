import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatMode } from './constants.js';
import { ICustomChatMode, IPromptsService } from './promptSyntax/service/promptsService.js';
export declare const IChatModeService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatModeService>;
export interface IChatModeService {
    readonly _serviceBrand: undefined;
    onDidChangeChatModes: Event<void>;
    getModes(): {
        builtin: readonly IChatMode[];
        custom?: readonly IChatMode[];
    };
    getModesAsync(): Promise<{
        builtin: readonly IChatMode[];
        custom?: readonly IChatMode[];
    }>;
}
export declare class ChatModeService extends Disposable implements IChatModeService {
    private readonly promptsService;
    private readonly chatAgentService;
    private readonly logService;
    readonly _serviceBrand: undefined;
    private latestCustomPromptModes;
    private readonly hasCustomModes;
    private readonly _onDidChangeChatModes;
    readonly onDidChangeChatModes: Event<void>;
    constructor(promptsService: IPromptsService, chatAgentService: IChatAgentService, contextKeyService: IContextKeyService, logService: ILogService);
    private refreshCustomPromptModes;
    getModes(): {
        builtin: readonly IChatMode[];
        custom?: readonly IChatMode[];
    };
    getModesAsync(): Promise<{
        builtin: readonly IChatMode[];
        custom?: readonly IChatMode[];
    }>;
    private getBuiltinModes;
}
/**
 * TODO This data object is not quite the right pattern, needs to live-update on file changes
 */
export interface IChatMode {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly kind: ChatMode;
    readonly customTools?: readonly string[];
    readonly body?: string;
}
export declare function isIChatMode(mode: unknown): mode is IChatMode;
export declare class CustomChatMode implements IChatMode {
    private readonly customChatMode;
    get id(): string;
    get name(): string;
    get description(): string | undefined;
    get customTools(): readonly string[] | undefined;
    get body(): string;
    readonly kind = ChatMode.Agent;
    constructor(customChatMode: ICustomChatMode);
    /**
     * Getters are not json-stringified
     */
    toJSON(): IChatMode;
}
export declare class BuiltinChatMode implements IChatMode {
    readonly kind: ChatMode;
    readonly description: string;
    constructor(kind: ChatMode, description: string);
    get id(): string;
    get name(): string;
    /**
     * Getters are not json-stringified
     */
    toJSON(): IChatMode;
}
export declare namespace ChatMode2 {
    const Ask: BuiltinChatMode;
    const Edit: BuiltinChatMode;
    const Agent: BuiltinChatMode;
}
export declare function validateChatMode2(mode: unknown): IChatMode | undefined;
export declare function isBuiltinChatMode(mode: IChatMode): boolean;
