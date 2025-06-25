import { CompletionItemKind } from '../../../../../editor/common/languages.js';
import { ISimpleCompletion, SimpleCompletionItem } from '../../../../services/suggest/browser/simpleCompletionItem.js';
export declare enum TerminalCompletionItemKind {
    File = 0,
    Folder = 1,
    Method = 2,
    Alias = 3,
    Argument = 4,
    Option = 5,
    OptionValue = 6,
    Flag = 7,
    SymbolicLinkFile = 8,
    SymbolicLinkFolder = 9,
    InlineSuggestion = 100,
    InlineSuggestionAlwaysOnTop = 101
}
export declare function mapLspKindToTerminalKind(lspKind: CompletionItemKind): TerminalCompletionItemKind;
export interface ITerminalCompletion extends ISimpleCompletion {
    /**
     * A custom string that should be input into the terminal when selecting this completion. This
     * is only required if the label is not what's being input.
     */
    inputData?: string;
    /**
     * The kind of terminal completion item.
     */
    kind?: TerminalCompletionItemKind;
    /**
     * A flag that can be used to override the kind check and treat this completion as a file when
     * it comes to sorting. For some pwsh completions come through as methods despite being files,
     * this makes sure they're sorted correctly.
     */
    isFileOverride?: boolean;
    /**
     * Whether the completion is a keyword.
     */
    isKeyword?: boolean;
}
export declare class TerminalCompletionItem extends SimpleCompletionItem {
    readonly completion: ITerminalCompletion;
    /**
     * {@link labelLow} without the file extension.
     */
    labelLowExcludeFileExt: string;
    /**
     * The lowercase label, when the completion is a file or directory this has  normalized path
     * separators (/) on Windows and no trailing separator for directories.
     */
    labelLowNormalizedPath: string;
    /**
     * The file extension part from {@link labelLow}.
     */
    fileExtLow: string;
    /**
     * A penalty that applies to completions that are comprised of only punctuation characters or
     * that applies to files or folders starting with the underscore character.
     */
    punctuationPenalty: 0 | 1;
    constructor(completion: ITerminalCompletion);
}
