import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { MarkdownToken } from './markdownToken.js';
/**
 * A token that represent a `markdown comment` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class MarkdownComment extends MarkdownToken {
    readonly text: string;
    constructor(range: Range, text: string);
    /**
     * Whether the comment has an end comment marker `-->`.
     */
    get hasEndMarker(): boolean;
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
