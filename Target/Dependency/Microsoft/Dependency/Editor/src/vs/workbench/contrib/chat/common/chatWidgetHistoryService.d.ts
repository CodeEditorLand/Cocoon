import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ModifiedFileEntryState } from './chatEditingService.js';
import { IChatRequestVariableEntry } from './chatVariableEntries.js';
import { IChatMode } from './chatModes.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
export interface IChatHistoryEntry {
    text: string;
    state?: IChatInputState;
}
/** The collected input state of ChatWidget contribs + attachments */
export interface IChatInputState {
    [key: string]: any;
    chatContextAttachments?: ReadonlyArray<IChatRequestVariableEntry>;
    chatWorkingSet?: ReadonlyArray<{
        uri: URI;
        state: ModifiedFileEntryState;
    }>;
    chatMode?: IChatMode | ChatMode;
}
export declare const IChatWidgetHistoryService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatWidgetHistoryService>;
export interface IChatWidgetHistoryService {
    _serviceBrand: undefined;
    readonly onDidClearHistory: Event<void>;
    clearHistory(): void;
    getHistory(location: ChatAgentLocation): IChatHistoryEntry[];
    saveHistory(location: ChatAgentLocation, history: IChatHistoryEntry[]): void;
}
export declare const ChatInputHistoryMaxEntries = 40;
export declare class ChatWidgetHistoryService implements IChatWidgetHistoryService {
    _serviceBrand: undefined;
    private memento;
    private viewState;
    private readonly _onDidClearHistory;
    readonly onDidClearHistory: Event<void>;
    constructor(storageService: IStorageService);
    getHistory(location: ChatAgentLocation): IChatHistoryEntry[];
    private getKey;
    saveHistory(location: ChatAgentLocation, history: IChatHistoryEntry[]): void;
    clearHistory(): void;
}
