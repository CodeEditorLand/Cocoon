import { MarkdownImage } from '../tokens/markdownImage.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { ExclamationMark } from '../../simpleCodec/tokens/exclamationMark.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
/**
 * The parser responsible for parsing the `markdown image` sequence of characters.
 * E.g., `![alt text](./path/to/image.jpeg)` syntax.
 */
export declare class PartialMarkdownImage extends ParserBase<TSimpleDecoderToken, PartialMarkdownImage | MarkdownImage> {
    /**
     * Current active parser instance, if in the mode of actively parsing the markdown link sequence.
     */
    private markdownLinkParser;
    constructor(token: ExclamationMark);
    /**
     * Get all currently available tokens of the `markdown link` sequence.
     */
    get tokens(): readonly TSimpleDecoderToken[];
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialMarkdownImage | MarkdownImage>;
}
