import { Event } from '../../../../../../base/common/event.js';
import { IObservable } from '../../../../../../base/common/observable.js';
import { ICodeEditor } from '../../../../../browser/editorBrowser.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
import { Command, InlineCompletionCommand, InlineCompletionDisplayLocation } from '../../../../../common/languages.js';
import { InlineCompletionsModel } from '../../model/inlineCompletionsModel.js';
import { InlineCompletionItem } from '../../model/inlineSuggestionItem.js';
import { IInlineEditHost, IInlineEditModel, InlineCompletionViewKind, InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
export declare class InlineEditModel implements IInlineEditModel {
    private readonly _model;
    readonly inlineEdit: InlineEditWithChanges;
    readonly tabAction: IObservable<InlineEditTabAction>;
    readonly action: Command | undefined;
    readonly displayName: string;
    readonly extensionCommands: InlineCompletionCommand[];
    readonly isInDiffEditor: boolean;
    readonly displayLocation: InlineCompletionDisplayLocation | undefined;
    readonly showCollapsed: IObservable<boolean>;
    constructor(_model: InlineCompletionsModel, inlineEdit: InlineEditWithChanges, tabAction: IObservable<InlineEditTabAction>);
    accept(): void;
    jump(): void;
    abort(reason: string): void;
    handleInlineEditShown(viewKind: InlineCompletionViewKind): void;
}
export declare class InlineEditHost implements IInlineEditHost {
    private readonly _model;
    readonly onDidAccept: Event<void>;
    readonly inAcceptFlow: IObservable<boolean>;
    constructor(_model: InlineCompletionsModel);
}
export declare class GhostTextIndicator {
    readonly lineRange: LineRange;
    readonly model: InlineEditModel;
    constructor(editor: ICodeEditor, model: InlineCompletionsModel, lineRange: LineRange, inlineCompletion: InlineCompletionItem);
}
