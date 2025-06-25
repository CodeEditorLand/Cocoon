import { LineReplacement } from '../../../../../common/core/edits/lineEdit.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
import { Position } from '../../../../../common/core/position.js';
import { TextEdit } from '../../../../../common/core/edits/textEdit.js';
import { AbstractText } from '../../../../../common/core/text/abstractText.js';
import { InlineCompletionCommand } from '../../../../../common/languages.js';
import { InlineSuggestionItem } from '../../model/inlineSuggestionItem.js';
export declare class InlineEditWithChanges {
    readonly originalText: AbstractText;
    readonly edit: TextEdit;
    readonly cursorPosition: Position;
    readonly commands: readonly InlineCompletionCommand[];
    readonly inlineCompletion: InlineSuggestionItem;
    get lineEdit(): LineReplacement;
    get originalLineRange(): LineRange;
    get modifiedLineRange(): LineRange | undefined;
    get displayRange(): LineRange;
    constructor(originalText: AbstractText, edit: TextEdit, cursorPosition: Position, commands: readonly InlineCompletionCommand[], inlineCompletion: InlineSuggestionItem);
    equals(other: InlineEditWithChanges): boolean;
}
