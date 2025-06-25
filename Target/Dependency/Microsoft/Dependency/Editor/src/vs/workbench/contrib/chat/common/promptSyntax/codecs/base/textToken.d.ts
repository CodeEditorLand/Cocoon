import { type BaseToken } from './baseToken.js';
import { CompositeToken } from './compositeToken.js';
/**
 * Tokens that represent a sequence of tokens that does not
 * hold an additional meaning in the text.
 */
export declare class Text<TTokens extends readonly BaseToken[] = readonly BaseToken[]> extends CompositeToken<TTokens> {
    toString(): string;
}
