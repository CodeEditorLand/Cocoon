import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ISingleEditOperation } from '../../../../common/core/editOperation.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletionEndOfLifeReason, InlineCompletion, InlineCompletionContext, InlineCompletions, InlineCompletionsProvider, PartialAcceptInfo, InlineCompletionsDisposeReason } from '../../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ITextModel } from '../../../../common/model.js';
import { InlineCompletionViewKind } from '../view/inlineEdits/inlineEditsViewInterface.js';
export type InlineCompletionContextWithoutUuid = Omit<InlineCompletionContext, 'requestUuid'>;
export declare function provideInlineCompletions(providers: InlineCompletionsProvider[], position: Position, model: ITextModel, context: InlineCompletionContextWithoutUuid, editorType: InlineCompletionEditorType, languageConfigurationService?: ILanguageConfigurationService): IInlineCompletionProviderResult;
/** If the token is eventually cancelled, this will not leak either. */
export declare function runWhenCancelled(token: CancellationToken, callback: () => void): IDisposable;
export interface IInlineCompletionProviderResult {
    get didAllProvidersReturn(): boolean;
    cancelAndDispose(reason: InlineCompletionsDisposeReason): void;
    lists: AsyncIterableObject<InlineSuggestionList>;
}
export type InlineSuggestViewData = {
    editorType: InlineCompletionEditorType;
    viewKind?: InlineCompletionViewKind;
    error?: string;
};
export declare class InlineSuggestData {
    readonly range: Range;
    readonly insertText: string;
    readonly snippetInfo: SnippetInfo | undefined;
    readonly displayLocation: IDisplayLocation | undefined;
    readonly additionalTextEdits: readonly ISingleEditOperation[];
    readonly sourceInlineCompletion: InlineCompletion;
    readonly source: InlineSuggestionList;
    readonly context: InlineCompletionContext;
    readonly isInlineEdit: boolean;
    private _didShow;
    private _showStartTime;
    private _shownDuration;
    private _showUncollapsedStartTime;
    private _showUncollapsedDuration;
    private _viewData;
    private _didReportEndOfLife;
    private _lastSetEndOfLifeReason;
    constructor(range: Range, insertText: string, snippetInfo: SnippetInfo | undefined, displayLocation: IDisplayLocation | undefined, additionalTextEdits: readonly ISingleEditOperation[], sourceInlineCompletion: InlineCompletion, source: InlineSuggestionList, context: InlineCompletionContext, isInlineEdit: boolean, editorType: InlineCompletionEditorType);
    get showInlineEditMenu(): boolean;
    getSingleTextEdit(): TextReplacement;
    reportInlineEditShown(commandService: ICommandService, updatedInsertText: string, viewKind: InlineCompletionViewKind): Promise<void>;
    reportPartialAccept(acceptedCharacters: number, info: PartialAcceptInfo): void;
    /**
     * Sends the end of life event to the provider.
     * If no reason is provided, the last set reason is used.
     * If no reason was set, the default reason is used.
    */
    reportEndOfLife(reason?: InlineCompletionEndOfLifeReason): void;
    reportInlineEditError(message: string): void;
    /**
     * Sets the end of life reason, but does not send the event to the provider yet.
    */
    setEndOfLifeReason(reason: InlineCompletionEndOfLifeReason): void;
    private updateShownDuration;
    private reportInlineEditHidden;
}
export interface SnippetInfo {
    snippet: string;
    range: Range;
}
export interface IDisplayLocation {
    range: Range;
    label: string;
}
export declare enum InlineCompletionEditorType {
    TextEditor = "textEditor",
    DiffEditor = "diffEditor"
}
/**
 * A ref counted pointer to the computed `InlineCompletions` and the `InlineCompletionsProvider` that
 * computed them.
 */
export declare class InlineSuggestionList {
    readonly inlineSuggestions: InlineCompletions;
    readonly inlineSuggestionsData: readonly InlineSuggestData[];
    readonly provider: InlineCompletionsProvider;
    private refCount;
    constructor(inlineSuggestions: InlineCompletions, inlineSuggestionsData: readonly InlineSuggestData[], provider: InlineCompletionsProvider);
    addRef(): void;
    removeRef(reason?: InlineCompletionsDisposeReason): void;
}
