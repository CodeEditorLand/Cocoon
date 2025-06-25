import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { SimpleToken } from '../../simpleCodec/tokens/simpleToken.js';
/**
 * A token that represent a `new line` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class NewLine extends SimpleToken<'\n'> {
    /**
     * The underlying symbol of the `NewLine` token.
     */
    static readonly symbol: '\n';
    /**
     * The byte representation of the {@link symbol}.
     */
    static readonly byte: VSBuffer;
    /**
     * Return text representation of the token.
     */
    get text(): '\n';
    /**
     * The byte representation of the token.
     */
    get byte(): VSBuffer;
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
