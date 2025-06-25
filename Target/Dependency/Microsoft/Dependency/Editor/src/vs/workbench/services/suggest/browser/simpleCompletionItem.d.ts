import { FuzzyScore } from '../../../../base/common/filters.js';
import { IMarkdownString } from '../../../../base/common/htmlContent.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
export interface CompletionItemLabel {
    label: string;
    detail?: string;
    description?: string;
}
export interface ISimpleCompletion {
    /**
     * The completion's label which appears on the left beside the icon.
     */
    label: string | CompletionItemLabel;
    /**
     * The ID of the provider the completion item came from
     */
    provider: string;
    /**
     * The completion's icon to show on the left of the suggest widget.
     */
    icon?: ThemeIcon;
    /**
     * The completion item's kind that will be included in the aria label.
     */
    kindLabel?: string;
    /**
     * The completion's detail which appears on the right of the list.
     */
    detail?: string;
    /**
     * A human-readable string that represents a doc-comment.
     */
    documentation?: string | IMarkdownString;
    /**
     * The start of the replacement.
     */
    replacementIndex: number;
    /**
     * The length of the replacement.
     */
    replacementLength: number;
}
export declare class SimpleCompletionItem {
    readonly completion: ISimpleCompletion;
    /**
     * The lowercase label, normalized to `\` path separators on Windows.
     */
    labelLow: string;
    textLabel: string;
    score: FuzzyScore;
    idx?: number;
    word?: string;
    isInvalid: boolean;
    constructor(completion: ISimpleCompletion);
}
