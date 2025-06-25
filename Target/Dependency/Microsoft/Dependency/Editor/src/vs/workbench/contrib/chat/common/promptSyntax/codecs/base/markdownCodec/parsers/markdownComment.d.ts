import { Dash } from '../../simpleCodec/tokens/dash.js';
import { MarkdownComment } from '../tokens/markdownComment.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { ExclamationMark } from '../../simpleCodec/tokens/exclamationMark.js';
import { LeftAngleBracket } from '../../simpleCodec/tokens/angleBrackets.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
/**
 * The parser responsible for parsing the `<!--` sequence - the start of a `markdown comment`.
 */
export declare class PartialMarkdownCommentStart extends ParserBase<TSimpleDecoderToken, PartialMarkdownCommentStart | MarkdownCommentStart> {
    constructor(token: LeftAngleBracket);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialMarkdownCommentStart | MarkdownCommentStart>;
}
/**
 * The parser responsible for a `markdown comment` sequence of tokens.
 * E.g. `<!-- some comment` which may or may not end with `-->`. If it does,
 * then the parser transitions to the {@link MarkdownComment} token.
 */
export declare class MarkdownCommentStart extends ParserBase<TSimpleDecoderToken, MarkdownCommentStart | MarkdownComment> {
    constructor(tokens: [LeftAngleBracket, ExclamationMark, Dash, Dash]);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<MarkdownCommentStart | MarkdownComment>;
    /**
     * Convert the current token sequence into a {@link MarkdownComment} token.
     *
     * Note! that this method marks the current parser object as "consumed"
     *       hence it should not be used after this method is called.
     */
    asMarkdownComment(): MarkdownComment;
    /**
     * Get range of current token sequence.
     */
    private get range();
    /**
     * Whether the current token sequence ends with two dashes.
     */
    private get endsWithDashes();
}
