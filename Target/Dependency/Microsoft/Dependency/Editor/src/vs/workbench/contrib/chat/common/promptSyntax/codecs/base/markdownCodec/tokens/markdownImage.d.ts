import { MarkdownToken } from './markdownToken.js';
import { IRange } from '../../../../../../../../../editor/common/core/range.js';
/**
 * A token that represent a `markdown image` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class MarkdownImage extends MarkdownToken {
    /**
     * The caption of the image, including the `!` and `square brackets`.
     */
    private readonly caption;
    /**
     * The reference of the image, including the parentheses.
     */
    private readonly reference;
    /**
     * Check if this `markdown image link` points to a valid URL address.
     */
    readonly isURL: boolean;
    constructor(
    /**
     * The starting line number of the image (1-based indexing).
     */
    lineNumber: number, 
    /**
     * The starting column number of the image (1-based indexing).
     */
    columnNumber: number, 
    /**
     * The caption of the image, including the `!` and `square brackets`.
     */
    caption: string, 
    /**
     * The reference of the image, including the parentheses.
     */
    reference: string);
    get text(): string;
    /**
     * Returns the `reference` part of the link without enclosing parentheses.
     */
    get path(): string;
    /**
     * Get the range of the `link part` of the token.
     */
    get linkRange(): IRange | undefined;
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
