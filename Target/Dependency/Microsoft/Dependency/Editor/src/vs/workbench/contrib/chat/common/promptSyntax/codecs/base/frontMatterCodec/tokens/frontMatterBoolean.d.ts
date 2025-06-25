import { BaseToken } from '../../baseToken.js';
import { Word } from '../../simpleCodec/tokens/tokens.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
/**
 * Token that represents a `boolean` value in a Front Matter header.
 */
export declare class FrontMatterBoolean extends FrontMatterValueToken<'boolean', readonly [Word]> {
    /**
     * Name of the `boolean` value type.
     */
    readonly valueTypeName = "boolean";
    /**
     * Value of the `boolean` token.
     */
    readonly value: boolean;
    /**
     * @throws if provided {@link Word} cannot be converted to a `boolean` value.
     */
    constructor(token: Word);
    /**
     * Try creating a {@link FrontMatterBoolean} out of provided token.
     * Unlike the constructor, this method does not throw, returning
     * a 'null' value on failure instead.
     */
    static tryFromToken(token: BaseToken): FrontMatterBoolean | null;
    equals(other: BaseToken): other is typeof this;
    toString(): string;
}
/**
 * Try to convert a {@link Word} token to a `boolean` value.
 */
export declare function asBoolean(token: Word): boolean | null;
