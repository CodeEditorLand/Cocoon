import { PromptAtMention } from '../tokens/promptAtMention.js';
import { At } from '../base/simpleCodec/tokens/at.js';
import { TSimpleDecoderToken } from '../base/simpleCodec/simpleDecoder.js';
import { ParserBase, TAcceptTokenResult } from '../base/simpleCodec/parserBase.js';
/**
 * List of characters that terminate the prompt at-mention sequence.
 */
export declare const STOP_CHARACTERS: readonly string[];
/**
 * List of characters that cannot be in an at-mention name (excluding the {@link STOP_CHARACTERS}).
 */
export declare const INVALID_NAME_CHARACTERS: readonly string[];
/**
 * The parser responsible for parsing a `prompt @mention` sequences.
 * E.g., `@workspace` or `@github` participant mention.
 */
export declare class PartialPromptAtMention extends ParserBase<TSimpleDecoderToken, PartialPromptAtMention | PromptAtMention> {
    constructor(token: At);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialPromptAtMention | PromptAtMention>;
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptAtMention} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `@` token is available.
     */
    asPromptAtMention(): PromptAtMention;
}
