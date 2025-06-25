import { TextReplacement } from '../../../../common/core/edits/textEdit.js';
import { InlineCompletionCommand } from '../../../../common/languages.js';
import { InlineSuggestionItem } from './inlineSuggestionItem.js';
export declare class InlineEdit {
    readonly edit: TextReplacement;
    readonly commands: readonly InlineCompletionCommand[];
    readonly inlineCompletion: InlineSuggestionItem;
    constructor(edit: TextReplacement, commands: readonly InlineCompletionCommand[], inlineCompletion: InlineSuggestionItem);
    get range(): import("../../../../common/core/range.js").Range;
    get text(): string;
    equals(other: InlineEdit): boolean;
}
