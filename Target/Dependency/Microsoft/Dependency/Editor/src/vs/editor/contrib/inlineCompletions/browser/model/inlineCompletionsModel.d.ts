import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IObservable, IObservableWithChange, IReader, ITransaction } from '../../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ICodeEditor } from '../../../../browser/editorBrowser.js';
import { Position } from '../../../../common/core/position.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletion, InlineCompletionTriggerKind, InlineCompletionCommand } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ITextModel } from '../../../../common/model.js';
import { IFeatureDebounceInformation } from '../../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { IModelContentChangedEvent } from '../../../../common/textModelEvents.js';
import { GhostTextOrReplacement } from './ghostText.js';
import { InlineEdit } from './inlineEdit.js';
import { InlineCompletionItem, InlineEditItem, InlineSuggestionItem } from './inlineSuggestionItem.js';
import { InlineCompletionEditorType } from './provideInlineCompletions.js';
import { SuggestItemInfo } from './suggestWidgetAdapter.js';
import { ICodeEditorService } from '../../../../browser/services/codeEditorService.js';
import { InlineCompletionViewKind } from '../view/inlineEdits/inlineEditsViewInterface.js';
export declare class InlineCompletionsModel extends Disposable {
    readonly textModel: ITextModel;
    private readonly _selectedSuggestItem;
    readonly _textModelVersionId: IObservableWithChange<number | null, IModelContentChangedEvent | undefined>;
    private readonly _positions;
    private readonly _debounceValue;
    private readonly _enabled;
    private readonly _editor;
    private readonly _instantiationService;
    private readonly _commandService;
    private readonly _languageConfigurationService;
    private readonly _accessibilityService;
    private readonly _languageFeaturesService;
    private readonly _codeEditorService;
    private readonly _source;
    private readonly _isActive;
    private readonly _onlyRequestInlineEditsSignal;
    private readonly _forceUpdateExplicitlySignal;
    private readonly _noDelaySignal;
    private readonly _fetchSpecificProviderSignal;
    private readonly _selectedInlineCompletionId;
    readonly primaryPosition: IObservableWithChange<Position, void>;
    private _isAcceptingPartially;
    get isAcceptingPartially(): boolean;
    private readonly _onDidAccept;
    readonly onDidAccept: import("../../../../../workbench/workbench.web.main.internal.js").Event<void>;
    private readonly _editorObs;
    private readonly _suggestPreviewEnabled;
    private readonly _suggestPreviewMode;
    private readonly _inlineSuggestMode;
    private readonly _suppressedInlineCompletionGroupIds;
    private readonly _inlineEditsEnabled;
    private readonly _inlineEditsShowCollapsedEnabled;
    constructor(textModel: ITextModel, _selectedSuggestItem: IObservable<SuggestItemInfo | undefined>, _textModelVersionId: IObservableWithChange<number | null, IModelContentChangedEvent | undefined>, _positions: IObservable<readonly Position[]>, _debounceValue: IFeatureDebounceInformation, _enabled: IObservable<boolean>, _editor: ICodeEditor, _instantiationService: IInstantiationService, _commandService: ICommandService, _languageConfigurationService: ILanguageConfigurationService, _accessibilityService: IAccessibilityService, _languageFeaturesService: ILanguageFeaturesService, _codeEditorService: ICodeEditorService);
    private _lastShownInlineCompletionInfo;
    private _lastAcceptedInlineCompletionInfo;
    private readonly _didUndoInlineEdits;
    debugGetSelectedSuggestItem(): IObservable<SuggestItemInfo | undefined>;
    getIndentationInfo(reader: IReader): {
        startsWithIndentation: boolean;
        startsWithIndentationLessThanTabSize: boolean;
    };
    private readonly _preserveCurrentCompletionReasons;
    private _getReason;
    readonly dontRefetchSignal: import("../../../../../base/common/observable.js").IObservableSignal<void>;
    private readonly _fetchInlineCompletionsPromise;
    trigger(tx?: ITransaction, options?: {
        onlyFetchInlineEdits?: boolean;
        noDelay?: boolean;
    }): Promise<void>;
    triggerExplicitly(tx?: ITransaction, onlyFetchInlineEdits?: boolean): Promise<void>;
    stop(stopReason?: 'explicitCancel' | 'automatic', tx?: ITransaction): void;
    private readonly _inlineCompletionItems;
    private readonly _filteredInlineCompletionItems;
    readonly selectedInlineCompletionIndex: IObservableWithChange<number, void>;
    readonly selectedInlineCompletion: IObservableWithChange<InlineCompletionItem | undefined, void>;
    readonly activeCommands: IObservable<InlineCompletionCommand[]>;
    readonly lastTriggerKind: IObservable<InlineCompletionTriggerKind | undefined>;
    readonly inlineCompletionsCount: IObservableWithChange<number | undefined, void>;
    private readonly _hasVisiblePeekWidgets;
    readonly state: IObservable<{
        kind: "ghostText";
        edits: readonly TextReplacement[];
        primaryGhostText: GhostTextOrReplacement;
        ghostTexts: readonly GhostTextOrReplacement[];
        suggestItem: SuggestItemInfo | undefined;
        inlineCompletion: InlineCompletionItem | undefined;
    } | {
        kind: "inlineEdit";
        edits: readonly TextReplacement[];
        inlineEdit: InlineEdit;
        inlineCompletion: InlineEditItem;
        cursorAtInlineEdit: IObservable<boolean>;
    } | undefined>;
    readonly status: IObservableWithChange<"loading" | "ghostText" | "inlineEdit" | "noSuggestion", void>;
    readonly inlineCompletionState: IObservableWithChange<{
        kind: "ghostText";
        edits: readonly TextReplacement[];
        primaryGhostText: GhostTextOrReplacement;
        ghostTexts: readonly GhostTextOrReplacement[];
        suggestItem: SuggestItemInfo | undefined;
        inlineCompletion: InlineCompletionItem | undefined;
    } | undefined, void>;
    readonly inlineEditState: IObservableWithChange<{
        kind: "inlineEdit";
        edits: readonly TextReplacement[];
        inlineEdit: InlineEdit;
        inlineCompletion: InlineEditItem;
        cursorAtInlineEdit: IObservable<boolean>;
    } | undefined, void>;
    readonly inlineEditAvailable: IObservableWithChange<boolean, void>;
    private _computeAugmentation;
    readonly warning: IObservableWithChange<import("../../../../common/languages.js").InlineCompletionWarning | undefined, void>;
    readonly ghostTexts: IObservable<readonly GhostTextOrReplacement[] | undefined>;
    readonly primaryGhostText: IObservable<GhostTextOrReplacement | undefined>;
    readonly showCollapsed: IObservableWithChange<boolean, void>;
    private readonly _tabShouldIndent;
    readonly tabShouldJumpToInlineEdit: IObservableWithChange<boolean, void>;
    readonly tabShouldAcceptInlineEdit: IObservableWithChange<boolean, void>;
    readonly isInDiffEditor: boolean;
    readonly editorType: InlineCompletionEditorType;
    private _deltaSelectedInlineCompletionIndex;
    next(): Promise<void>;
    previous(): Promise<void>;
    private _getMetadata;
    accept(editor?: ICodeEditor): Promise<void>;
    acceptNextWord(): Promise<void>;
    acceptNextLine(): Promise<void>;
    private _acceptNext;
    handleSuggestAccepted(item: SuggestItemInfo): void;
    extractReproSample(): Repro;
    private readonly _jumpedToId;
    private readonly _inAcceptFlow;
    readonly inAcceptFlow: IObservable<boolean>;
    jump(): void;
    handleInlineSuggestionShown(inlineCompletion: InlineSuggestionItem, viewKind: InlineCompletionViewKind): Promise<void>;
}
interface Repro {
    documentValue: string;
    inlineCompletion: InlineCompletion | undefined;
}
export declare enum VersionIdChangeReason {
    Undo = 0,
    Redo = 1,
    AcceptWord = 2,
    Other = 3
}
export declare function getSecondaryEdits(textModel: ITextModel, positions: readonly Position[], primaryEdit: TextReplacement): TextReplacement[];
export {};
