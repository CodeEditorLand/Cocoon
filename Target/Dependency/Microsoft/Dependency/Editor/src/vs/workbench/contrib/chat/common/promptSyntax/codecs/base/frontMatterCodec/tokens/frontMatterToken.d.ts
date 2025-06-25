import { BaseToken } from '../../baseToken.js';
import { CompositeToken } from '../../compositeToken.js';
import { FrontMatterSequence } from './frontMatterSequence.js';
/**
 * Base class for all tokens inside a Front Matter header.
 */
export declare abstract class FrontMatterToken<TTokens extends readonly BaseToken[] = readonly BaseToken[]> extends CompositeToken<TTokens> {
}
/**
 * List of all currently supported value types.
 */
export type TValueTypeName = 'quoted-string' | 'boolean' | 'array' | FrontMatterSequence;
/**
 * Base class for all tokens that represent a `value` inside a Front Matter header.
 */
export declare abstract class FrontMatterValueToken<TTypeName extends TValueTypeName = TValueTypeName, TTokens extends readonly BaseToken[] = readonly BaseToken[]> extends FrontMatterToken<TTokens> {
    /**
     * Type name of the `value` represented by this token.
     */
    abstract readonly valueTypeName: TTypeName;
}
