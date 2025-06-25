import { LeftBracket, RightBracket } from '../../simpleCodec/tokens/tokens.js';
import { FrontMatterValueToken, type TValueTypeName } from './frontMatterToken.js';
/**
 * Token that represents an `array` value in a Front Matter header.
 */
export declare class FrontMatterArray extends FrontMatterValueToken<'array', [
    LeftBracket,
    ...FrontMatterValueToken<TValueTypeName>[],
    RightBracket
]> {
    /**
     * Name of the `array` value type.
     */
    readonly valueTypeName = "array";
    /**
     * List of the array items.
     */
    get items(): readonly FrontMatterValueToken<TValueTypeName>[];
    toString(): string;
}
