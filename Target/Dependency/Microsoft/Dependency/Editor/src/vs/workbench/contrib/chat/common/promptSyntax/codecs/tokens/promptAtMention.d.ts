import { PromptToken } from './promptToken.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Represents a `@mention` token in a prompt text.
 */
export declare class PromptAtMention extends PromptToken {
    /**
     * The name of a mention, excluding the `@` character at the start.
     */
    readonly name: string;
    constructor(range: Range, 
    /**
     * The name of a mention, excluding the `@` character at the start.
     */
    name: string);
    /**
     * Get full text of the token.
     */
    get text(): string;
    /**
     * Return a string representation of the token.
     */
    toString(): string;
}
