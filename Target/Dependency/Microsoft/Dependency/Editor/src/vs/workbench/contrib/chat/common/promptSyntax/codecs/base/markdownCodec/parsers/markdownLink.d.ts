import { MarkdownLink } from '../tokens/markdownLink.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { LeftBracket } from '../../simpleCodec/tokens/brackets.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
import { LeftParenthesis } from '../../simpleCodec/tokens/parentheses.js';
/**
 * The parser responsible for parsing a `markdown link caption` part of a markdown
 * link (e.g., the `[caption text]` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with single `[` token and collects all tokens until
 * the first `]` token is encountered. In this successful case, the parser transitions
 * into the {@link MarkdownLinkCaption} parser type which continues the general
 * parsing process of the markdown link.
 *
 * Otherwise, if one of the stop characters defined in the {@link MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the `]` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 */
export declare class PartialMarkdownLinkCaption extends ParserBase<TSimpleDecoderToken, PartialMarkdownLinkCaption | MarkdownLinkCaption> {
    constructor(token: LeftBracket);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialMarkdownLinkCaption | MarkdownLinkCaption>;
}
/**
 * The parser responsible for transitioning from a {@link PartialMarkdownLinkCaption}
 * parser to the {@link PartialMarkdownLink} one, therefore serves a parser glue between
 * the `[caption]` and the `(./some/path)` parts of the `[caption](./some/path)` link.
 *
 * The only successful case of this parser is the `(` token that initiated the process
 * of parsing the `reference` part of a markdown link and in this case the parser
 * transitions into the `PartialMarkdownLink` parser type.
 *
 * Any other character is considered a failure result. In this case, the caller is assumed
 * to be responsible for re-emitting the {@link tokens} accumulated so far as standalone
 * entities since they are no longer represent a coherent token entity of a larger size.
 */
export declare class MarkdownLinkCaption extends ParserBase<TSimpleDecoderToken, MarkdownLinkCaption | PartialMarkdownLink> {
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<MarkdownLinkCaption | PartialMarkdownLink>;
}
/**
 * The parser responsible for parsing a `link reference` part of a markdown link
 * (e.g., the `(./some/path)` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with tokens that represent the `[caption]` part of a markdown
 * link, followed by the `(` token. The parser collects all subsequent tokens until final closing
 * parenthesis (`)`) is encountered (*\*see [1] below*). In this successful case, the parser object
 * transitions into the {@link MarkdownLink} token type which signifies the end of the entire
 * parsing process of the link text.
 *
 * Otherwise, if one of the stop characters defined in the {@link MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the final `)` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 *
 * `[1]` The `reference` part of the markdown link can contain any number of nested parenthesis, e.g.,
 * 	  `[caption](/some/p(th/file.md)` is a valid markdown link and a valid folder name, hence number
 *     of open parenthesis must match the number of closing ones and the path sequence is considered
 *     to be complete as soon as this requirement is met. Therefore the `final` word is used in
 *     the description comments above to highlight this important detail.
 */
export declare class PartialMarkdownLink extends ParserBase<TSimpleDecoderToken, PartialMarkdownLink | MarkdownLink> {
    protected readonly captionTokens: TSimpleDecoderToken[];
    /**
     * Number of open parenthesis in the sequence.
     * See comment in the {@link accept} method for more details.
     */
    private openParensCount;
    constructor(captionTokens: TSimpleDecoderToken[], token: LeftParenthesis);
    get tokens(): readonly TSimpleDecoderToken[];
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialMarkdownLink | MarkdownLink>;
}
