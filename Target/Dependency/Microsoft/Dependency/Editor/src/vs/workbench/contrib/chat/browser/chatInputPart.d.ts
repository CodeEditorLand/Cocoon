import { IHistoryNavigationWidget } from '../../../../base/browser/history.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { IChatEditingSession } from '../common/chatEditingService.js';
import { IChatEntitlementService } from '../common/chatEntitlementService.js';
import { IChatRequestVariableEntry, ChatRequestVariableSet } from '../common/chatVariableEntries.js';
import { IChatMode, IChatModeService } from '../common/chatModes.js';
import { IChatFollowup } from '../common/chatService.js';
import { IChatResponseViewModel } from '../common/chatViewModel.js';
import { IChatInputState, IChatWidgetHistoryService } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatMode } from '../common/constants.js';
import { ILanguageModelChatMetadata, ILanguageModelChatMetadataAndIdentifier, ILanguageModelsService } from '../common/languageModels.js';
import { IChatWidget } from './chat.js';
import { ChatAttachmentModel } from './chatAttachmentModel.js';
import { ChatSelectedTools } from './chatSelectedTools.js';
import { IChatViewState } from './chatWidget.js';
import { ChatImplicitContext } from './contrib/chatImplicitContext.js';
import { ChatRelatedFiles } from './contrib/chatInputRelatedFilesContrib.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
export interface IChatInputStyles {
    overlayBackground: string;
    listForeground: string;
    listBackground: string;
}
interface IChatInputPartOptions {
    renderFollowups: boolean;
    renderStyle?: 'compact';
    menus: {
        executeToolbar: MenuId;
        inputSideToolbar?: MenuId;
        telemetrySource?: string;
    };
    editorOverflowWidgetsDomNode?: HTMLElement;
    renderWorkingSet?: boolean;
    enableImplicitContext?: boolean;
    supportsChangingModes?: boolean;
    dndContainer?: HTMLElement;
    widgetViewKindTag: string;
}
export interface IWorkingSetEntry {
    uri: URI;
}
export declare class ChatInputPart extends Disposable implements IHistoryNavigationWidget {
    private readonly location;
    private readonly options;
    private readonly historyService;
    private readonly modelService;
    private readonly instantiationService;
    private readonly contextKeyService;
    private readonly configurationService;
    private readonly keybindingService;
    private readonly accessibilityService;
    private readonly languageModelsService;
    private readonly logService;
    private readonly fileService;
    private readonly editorService;
    private readonly themeService;
    private readonly textModelResolverService;
    private readonly storageService;
    private readonly labelService;
    private readonly agentService;
    private readonly sharedWebExtracterService;
    private readonly experimentService;
    private readonly entitlementService;
    private readonly chatModeService;
    private readonly promptsService;
    private static _counter;
    private _onDidLoadInputState;
    readonly onDidLoadInputState: Event<IChatInputState | undefined>;
    private _onDidChangeHeight;
    readonly onDidChangeHeight: Event<void>;
    private _onDidFocus;
    readonly onDidFocus: Event<void>;
    private _onDidBlur;
    readonly onDidBlur: Event<void>;
    private _onDidChangeContext;
    readonly onDidChangeContext: Event<{
        removed?: IChatRequestVariableEntry[];
        added?: IChatRequestVariableEntry[];
    }>;
    private _onDidAcceptFollowup;
    readonly onDidAcceptFollowup: Event<{
        followup: IChatFollowup;
        response: IChatResponseViewModel | undefined;
    }>;
    private readonly _attachmentModel;
    get attachmentModel(): ChatAttachmentModel;
    readonly selectedToolsModel: ChatSelectedTools;
    getAttachedAndImplicitContext(sessionId: string): ChatRequestVariableSet;
    /**
     * Check if the chat input part has any prompt file attachments.
     */
    get hasPromptFileAttachments(): boolean;
    private _indexOfLastAttachedContextDeletedWithKeyboard;
    private _indexOfLastOpenedContext;
    private _implicitContext;
    get implicitContext(): ChatImplicitContext | undefined;
    private _relatedFiles;
    get relatedFiles(): ChatRelatedFiles | undefined;
    private _hasFileAttachmentContextKey;
    private readonly _onDidChangeVisibility;
    private readonly _contextResourceLabels;
    private readonly inputEditorMaxHeight;
    private inputEditorHeight;
    private container;
    private inputSideToolbarContainer?;
    private followupsContainer;
    private readonly followupsDisposables;
    private attachmentsContainer;
    private attachedContextContainer;
    private readonly attachedContextDisposables;
    private relatedFilesContainer;
    private chatEditingSessionWidgetContainer;
    private _inputPartHeight;
    get inputPartHeight(): number;
    private _followupsHeight;
    get followupsHeight(): number;
    private _editSessionWidgetHeight;
    get editSessionWidgetHeight(): number;
    get attachmentsHeight(): number;
    private _inputEditor;
    private _inputEditorElement;
    private executeToolbar;
    private inputActionsToolbar;
    private addFilesToolbar;
    get inputEditor(): CodeEditorWidget;
    private readonly dnd;
    private history;
    private historyNavigationBackwardsEnablement;
    private historyNavigationForewardsEnablement;
    private inputModel;
    private inputEditorHasText;
    private chatCursorAtTop;
    private inputEditorHasFocus;
    /**
     * Context key is set when prompt instructions are attached.
     */
    private promptFileAttached;
    private chatMode;
    private modelWidget;
    private readonly _waitForPersistedLanguageModel;
    private _onDidChangeCurrentLanguageModel;
    private _currentLanguageModel;
    get currentLanguageModel(): string | undefined;
    get selectedLanguageModel(): ILanguageModelChatMetadataAndIdentifier | undefined;
    private _onDidChangeCurrentChatMode;
    readonly onDidChangeCurrentChatMode: Event<void>;
    private _currentMode;
    get currentMode(): ChatMode;
    get currentMode2(): IChatMode;
    private cachedDimensions;
    private cachedExecuteToolbarWidth;
    private cachedInputToolbarWidth;
    readonly inputUri: URI;
    private readonly _chatEditsActionsDisposables;
    private readonly _chatEditsDisposables;
    private _chatEditsListPool;
    private _chatEditList;
    get selectedElements(): URI[];
    private _attemptedWorkingSetEntriesCount;
    /**
     * The number of working set entries that the user actually wanted to attach.
     * This is less than or equal to {@link ChatInputPart.chatEditWorkingSetFiles}.
     */
    get attemptedWorkingSetEntriesCount(): number;
    private readonly getInputState;
    /**
     * Number consumers holding the 'generating' lock.
     */
    private _generating?;
    constructor(location: ChatAgentLocation, options: IChatInputPartOptions, styles: IChatInputStyles, getContribsInputState: () => any, historyService: IChatWidgetHistoryService, modelService: IModelService, instantiationService: IInstantiationService, contextKeyService: IContextKeyService, configurationService: IConfigurationService, keybindingService: IKeybindingService, accessibilityService: IAccessibilityService, languageModelsService: ILanguageModelsService, logService: ILogService, fileService: IFileService, editorService: IEditorService, themeService: IThemeService, textModelResolverService: ITextModelService, storageService: IStorageService, labelService: ILabelService, agentService: IChatAgentService, sharedWebExtracterService: ISharedWebContentExtractorService, experimentService: IWorkbenchAssignmentService, entitlementService: IChatEntitlementService, chatModeService: IChatModeService, promptsService: IPromptsService);
    private getSelectedModelStorageKey;
    private getSelectedModelIsDefaultStorageKey;
    private initSelectedModel;
    switchModel(modelMetadata: Pick<ILanguageModelChatMetadata, 'vendor' | 'id' | 'family'>): void;
    switchToNextModel(): void;
    openModelPicker(): void;
    private checkModelSupported;
    setChatMode(mode: ChatMode, storeSelection?: boolean): void;
    setChatMode2(mode: IChatMode, storeSelection?: boolean): void;
    private modelSupportedForDefaultAgent;
    private getModels;
    private setCurrentLanguageModelToDefault;
    private setCurrentLanguageModel;
    private loadHistory;
    private _getAriaLabel;
    private validateCurrentChatMode;
    initForNewChatModel(state: IChatViewState, modelIsEmpty: boolean): void;
    private setExpModelOrWait;
    private getDefaultModeExperimentStorageKey;
    logInputHistory(): void;
    setVisible(visible: boolean): void;
    /** If consumers are busy generating the chat input, returns the promise resolved when they finish */
    get generating(): Promise<void> | undefined;
    /** Disables the input submissions buttons until the disposable is disposed. */
    startGenerating(): IDisposable;
    get element(): HTMLElement;
    showPreviousValue(): Promise<void>;
    showNextValue(): Promise<void>;
    private navigateHistory;
    setValue(value: string, transient: boolean): void;
    private saveCurrentValue;
    focus(): void;
    hasFocus(): boolean;
    /**
     * Reset the input and update history.
     * @param userQuery If provided, this will be added to the history. Followups and programmatic queries should not be passed.
     */
    acceptInput(isUserQuery?: boolean): Promise<void>;
    validateAgentMode(): void;
    private getFilteredEntry;
    private _acceptInputForVoiceover;
    private _handleAttachedContextChange;
    render(container: HTMLElement, initialValue: string, widget: IChatWidget): void;
    private renderAttachedContext;
    private handleAttachmentDeletion;
    private handleAttachmentOpen;
    private handleAttachmentNavigation;
    renderChatEditingSessionState(chatEditingSession: IChatEditingSession | null): Promise<void>;
    renderChatRelatedFiles(): Promise<void>;
    renderFollowups(items: IChatFollowup[] | undefined, response: IChatResponseViewModel | undefined): Promise<void>;
    get contentHeight(): number;
    layout(height: number, width: number): void;
    private previousInputEditorDimension;
    private _layout;
    private getLayoutData;
    getViewState(): IChatInputState;
    saveState(): void;
}
export {};
