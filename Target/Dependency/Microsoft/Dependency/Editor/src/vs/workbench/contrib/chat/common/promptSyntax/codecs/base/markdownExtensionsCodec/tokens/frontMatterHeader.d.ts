import { Text } from '../../textToken.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { FrontMatterMarker, TMarkerToken } from './frontMatterMarker.js';
/**
 * Token that represents a `Front Matter` header in a text.
 */
export declare class FrontMatterHeader extends MarkdownExtensionsToken {
    readonly startMarker: FrontMatterMarker;
    readonly content: Text;
    readonly endMarker: FrontMatterMarker;
    constructor(range: Range, startMarker: FrontMatterMarker, content: Text, endMarker: FrontMatterMarker);
    /**
     * Return complete text representation of the token.
     */
    get text(): string;
    /**
     * Range of the content of the Front Matter header.
     */
    get contentRange(): Range;
    /**
     * Content token of the Front Matter header.
     */
    get contentToken(): Text;
    /**
     * Create new instance of the token from the given tokens.
     */
    static fromTokens(startMarkerTokens: readonly TMarkerToken[], contentTokens: readonly TSimpleDecoderToken[], endMarkerTokens: readonly TMarkerToken[]): FrontMatterHeader;
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
