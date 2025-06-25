import { IObservable } from '../../../../../base/common/observable.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ISingleEditOperation } from '../../../../common/core/editOperation.js';
import { StringEdit } from '../../../../common/core/edits/stringEdit.js';
import { Position } from '../../../../common/core/position.js';
import { PositionOffsetTransformerBase } from '../../../../common/core/text/positionToOffset.js';
import { Range } from '../../../../common/core/range.js';
import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletion, Command, InlineCompletionWarning, PartialAcceptInfo, InlineCompletionEndOfLifeReason } from '../../../../common/languages.js';
import { ITextModel } from '../../../../common/model.js';
import { IDisplayLocation, InlineSuggestData, InlineSuggestionList, SnippetInfo } from './provideInlineCompletions.js';
import { InlineCompletionViewKind } from '../view/inlineEdits/inlineEditsViewInterface.js';
export type InlineSuggestionItem = InlineEditItem | InlineCompletionItem;
export declare namespace InlineSuggestionItem {
    function create(data: InlineSuggestData, textModel: ITextModel): InlineSuggestionItem;
}
declare abstract class InlineSuggestionItemBase {
    protected readonly _data: InlineSuggestData;
    readonly identity: InlineSuggestionIdentity;
    readonly displayLocation: InlineSuggestDisplayLocation | undefined;
    constructor(_data: InlineSuggestData, identity: InlineSuggestionIdentity, displayLocation: InlineSuggestDisplayLocation | undefined);
    /**
     * A reference to the original inline completion list this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    get source(): InlineSuggestionList;
    get isFromExplicitRequest(): boolean;
    get forwardStable(): boolean;
    get editRange(): Range;
    get targetRange(): Range;
    get insertText(): string;
    get semanticId(): string;
    get action(): Command | undefined;
    get command(): Command | undefined;
    get warning(): InlineCompletionWarning | undefined;
    get showInlineEditMenu(): boolean;
    get hash(): string;
    /** @deprecated */
    get shownCommand(): Command | undefined;
    get requestUuid(): string;
    /**
     * A reference to the original inline completion this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    private get _sourceInlineCompletion();
    abstract getSingleTextEdit(): TextReplacement;
    abstract withEdit(userEdit: StringEdit, textModel: ITextModel): InlineSuggestionItem | undefined;
    abstract withIdentity(identity: InlineSuggestionIdentity): InlineSuggestionItem;
    abstract canBeReused(model: ITextModel, position: Position): boolean;
    addRef(): void;
    removeRef(): void;
    reportInlineEditShown(commandService: ICommandService, viewKind: InlineCompletionViewKind): void;
    reportPartialAccept(acceptedCharacters: number, info: PartialAcceptInfo): void;
    reportEndOfLife(reason: InlineCompletionEndOfLifeReason): void;
    setEndOfLifeReason(reason: InlineCompletionEndOfLifeReason): void;
    reportInlineEditError(reason: string): void;
    /**
     * Avoid using this method. Instead introduce getters for the needed properties.
    */
    getSourceCompletion(): InlineCompletion;
}
export declare class InlineSuggestionIdentity {
    private static idCounter;
    private readonly _onDispose;
    readonly onDispose: IObservable<void>;
    private _refCount;
    readonly id: string;
    addRef(): void;
    removeRef(): void;
}
declare class InlineSuggestDisplayLocation implements IDisplayLocation {
    private readonly _offsetRange;
    readonly range: Range;
    readonly label: string;
    static create(displayLocation: IDisplayLocation, textmodel: ITextModel): InlineSuggestDisplayLocation;
    private constructor();
    withEdit(edit: StringEdit, positionOffsetTransformer: PositionOffsetTransformerBase): InlineSuggestDisplayLocation | undefined;
}
export declare class InlineCompletionItem extends InlineSuggestionItemBase {
    private readonly _edit;
    private readonly _textEdit;
    private readonly _originalRange;
    readonly snippetInfo: SnippetInfo | undefined;
    readonly additionalTextEdits: readonly ISingleEditOperation[];
    static create(data: InlineSuggestData, textModel: ITextModel): InlineCompletionItem;
    readonly isInlineEdit = false;
    private constructor();
    getSingleTextEdit(): TextReplacement;
    withIdentity(identity: InlineSuggestionIdentity): InlineCompletionItem;
    withEdit(textModelEdit: StringEdit, textModel: ITextModel): InlineCompletionItem | undefined;
    canBeReused(model: ITextModel, position: Position): boolean;
    isVisible(model: ITextModel, cursorPosition: Position): boolean;
}
export declare class InlineEditItem extends InlineSuggestionItemBase {
    private readonly _edit;
    private readonly _textEdit;
    private readonly _edits;
    private readonly _lastChangePartOfInlineEdit;
    private readonly _inlineEditModelVersion;
    static create(data: InlineSuggestData, textModel: ITextModel): InlineEditItem;
    readonly snippetInfo: SnippetInfo | undefined;
    readonly additionalTextEdits: readonly ISingleEditOperation[];
    readonly isInlineEdit = true;
    private constructor();
    get updatedEditModelVersion(): number;
    get updatedEdit(): StringEdit;
    getSingleTextEdit(): TextReplacement;
    withIdentity(identity: InlineSuggestionIdentity): InlineEditItem;
    canBeReused(model: ITextModel, position: Position): boolean;
    withEdit(textModelChanges: StringEdit, textModel: ITextModel): InlineEditItem | undefined;
    private _applyTextModelChanges;
}
export {};
