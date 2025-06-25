import { BaseToken } from './baseToken.js';
/**
 * Composite token consists of a list of other tokens.
 * Composite token consists of a list of other tokens.
 */
export declare abstract class CompositeToken<TTokens extends readonly BaseToken[]> extends BaseToken {
    /**
     * Reference to the list of child tokens.
     */
    protected readonly childTokens: [...TTokens];
    constructor(tokens: TTokens);
    get text(): string;
    /**
     * Tokens that this composite token consists of.
     */
    get children(): TTokens;
    /**
     * Check if this token is equal to another one,
     * including all of its child tokens.
     */
    equals(other: BaseToken): other is typeof this;
}
