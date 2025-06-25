import { PromptVariable, PromptVariableWithData } from '../tokens/promptVariable.js';
import { Hash } from '../base/simpleCodec/tokens/hash.js';
import { TSimpleDecoderToken } from '../base/simpleCodec/simpleDecoder.js';
import { ParserBase, TAcceptTokenResult } from '../base/simpleCodec/parserBase.js';
/**
 * List of characters that terminate the prompt variable sequence.
 */
export declare const STOP_CHARACTERS: readonly string[];
/**
 * List of characters that cannot be in a variable name (excluding the {@link STOP_CHARACTERS}).
 */
export declare const INVALID_NAME_CHARACTERS: readonly string[];
/**
 * The parser responsible for parsing a `prompt variable name`.
 * E.g., `#selection` or `#codebase` variable. If the `:` character follows
 * the variable name, the parser transitions to {@link PartialPromptVariableWithData}
 * that is also able to parse the `data` part of the variable. E.g., the `#file` part
 * of the `#file:/path/to/something.md` sequence.
 */
export declare class PartialPromptVariableName extends ParserBase<TSimpleDecoderToken, PartialPromptVariableName | PartialPromptVariableWithData | PromptVariable> {
    constructor(token: Hash);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialPromptVariableName | PartialPromptVariableWithData | PromptVariable>;
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptVariable} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `#` token is available.
     */
    asPromptVariable(): PromptVariable;
}
/**
 * The parser responsible for parsing a `prompt variable name` with `data`.
 * E.g., the `/path/to/something.md` part of the `#file:/path/to/something.md` sequence.
 */
export declare class PartialPromptVariableWithData extends ParserBase<TSimpleDecoderToken, PartialPromptVariableWithData | PromptVariableWithData> {
    constructor(tokens: readonly TSimpleDecoderToken[]);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialPromptVariableWithData | PromptVariableWithData>;
    /**
     * Try to convert current parser instance into a fully-parsed {@link asPromptVariableWithData} token.
     */
    asPromptVariableWithData(): PromptVariableWithData;
}
