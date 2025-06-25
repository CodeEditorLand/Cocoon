import { PromptToken } from './promptToken.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Represents a `${variable}` token in a prompt text.
 */
export declare class PromptTemplateVariable extends PromptToken {
    /**
     * The contents of the template variable, excluding
     * the surrounding `${}` characters.
     */
    readonly contents: string;
    constructor(range: Range, 
    /**
     * The contents of the template variable, excluding
     * the surrounding `${}` characters.
     */
    contents: string);
    /**
     * Get full text of the token.
     */
    get text(): string;
    /**
     * Return a string representation of the token.
     */
    toString(): string;
}
