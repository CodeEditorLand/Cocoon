import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { SimpleToken } from '../../simpleCodec/tokens/simpleToken.js';
/**
 * Token that represent a `carriage return` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class CarriageReturn extends SimpleToken<'\r'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '\r';
    /**
     * The byte representation of the {@link symbol}.
     */
    static readonly byte: VSBuffer;
    /**
     * The byte representation of the token.
     */
    get byte(): VSBuffer;
    /**
     * Return text representation of the token.
     */
    get text(): '\r';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
