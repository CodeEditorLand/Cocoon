import { Disposable } from '../../../../base/common/lifecycle.js';
import { IObservable, ObservableMap } from '../../../../base/common/observable.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatMode } from '../common/constants.js';
import { ILanguageModelToolsService, IToolData, ToolSet } from '../common/languageModelToolsService.js';
export declare class ChatSelectedTools extends Disposable {
    private readonly _toolsService;
    private readonly _selectedTools;
    private readonly _sessionSelectedTools;
    private readonly _allTools;
    /**
     * All tools and tool sets with their enabled state.
     */
    readonly entriesMap: ObservableMap<IToolData | ToolSet, boolean>;
    /**
     * All enabled tools and tool sets.
     */
    readonly entries: IObservable<ReadonlySet<IToolData | ToolSet>>;
    constructor(mode: IObservable<ChatMode>, _toolsService: ILanguageModelToolsService, storageService: IStorageService);
    resetSessionEnablementState(): void;
    enable(toolSets: readonly ToolSet[], tools: readonly IToolData[], sessionOnly: boolean): void;
    disable(disabledToolSets: readonly ToolSet[], disableTools: readonly IToolData[], sessionOnly: boolean): void;
    asEnablementMap(): Map<IToolData, boolean>;
}
