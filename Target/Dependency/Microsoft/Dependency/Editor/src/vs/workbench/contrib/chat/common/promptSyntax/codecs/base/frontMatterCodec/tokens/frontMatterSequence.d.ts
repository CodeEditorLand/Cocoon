import { FrontMatterValueToken } from './frontMatterToken.js';
import { SpacingToken } from '../../simpleCodec/tokens/tokens.js';
import { type TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
/**
 * Token represents a generic sequence of tokens in a Front Matter header.
 */
export declare class FrontMatterSequence extends FrontMatterValueToken<FrontMatterSequence, readonly TSimpleDecoderToken[]> {
    /**
     * @override Because this token represent a generic sequence of tokens,
     *           the type name is represented by the sequence of tokens itself
     */
    get valueTypeName(): this;
    /**
     * Text of the sequence value. The method exists to provide a
     * consistent interface with {@link FrontMatterString} token.
     *
     * Note! that this method does not automatically trim spacing tokens
     *       in the sequence. If you need to get a trimmed value, call
     *       {@link trimEnd} method first.
     */
    get cleanText(): string;
    /**
     * Trim spacing tokens at the end of the sequence.
     */
    trimEnd(): readonly SpacingToken[];
    toString(): string;
}
