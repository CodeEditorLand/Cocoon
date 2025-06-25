import { PromptToken } from './promptToken.js';
import { IRange, Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Represents a `#variable` token in a prompt text.
 */
export declare class PromptVariable extends PromptToken {
    /**
     * The name of a prompt variable, excluding the `#` character at the start.
     */
    readonly name: string;
    constructor(range: Range, 
    /**
     * The name of a prompt variable, excluding the `#` character at the start.
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
/**
 * Represents a {@link PromptVariable} with additional data token in a prompt text.
 * (e.g., `#variable:/path/to/file.md`)
 */
export declare class PromptVariableWithData extends PromptVariable {
    /**
     * The data of the variable, excluding the starting {@link DATA_SEPARATOR} character.
     */
    readonly data: string;
    constructor(fullRange: Range, 
    /**
     * The name of the variable, excluding the starting `#` character.
     */
    name: string, 
    /**
     * The data of the variable, excluding the starting {@link DATA_SEPARATOR} character.
     */
    data: string);
    /**
     * Get full text of the token.
     */
    get text(): string;
    /**
     * Range of the `data` part of the variable.
     */
    get dataRange(): IRange | undefined;
}
