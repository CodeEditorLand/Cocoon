import { PromptSlashCommand } from '../tokens/promptSlashCommand.js';
import { Slash } from '../base/simpleCodec/tokens/slash.js';
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
 * The parser responsible for parsing a `prompt /command` sequences.
 * E.g., `/search` or `/explain` command.
 */
export declare class PartialPromptSlashCommand extends ParserBase<TSimpleDecoderToken, PartialPromptSlashCommand | PromptSlashCommand> {
    constructor(token: Slash);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialPromptSlashCommand | PromptSlashCommand>;
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptSlashCommand} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `/` token is available.
     */
    asPromptSlashCommand(): PromptSlashCommand;
}
