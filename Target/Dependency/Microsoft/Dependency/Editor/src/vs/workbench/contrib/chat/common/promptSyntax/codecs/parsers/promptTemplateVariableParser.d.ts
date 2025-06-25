import { PromptTemplateVariable } from '../tokens/promptTemplateVariable.js';
import { TSimpleDecoderToken } from '../base/simpleCodec/simpleDecoder.js';
import { DollarSign, LeftCurlyBrace } from '../base/simpleCodec/tokens/tokens.js';
import { ParserBase, TAcceptTokenResult } from '../base/simpleCodec/parserBase.js';
/**
 * Parsers of the `${variable}` token sequence in a prompt text.
 */
export type TPromptTemplateVariableParser = PartialPromptTemplateVariableStart | PartialPromptTemplateVariable;
/**
 * Parser that handles start sequence of a `${variable}` token sequence in
 * a prompt text. Transitions to {@link PartialPromptTemplateVariable} parser
 * as soon as the `${` character sequence is found.
 */
export declare class PartialPromptTemplateVariableStart extends ParserBase<DollarSign | LeftCurlyBrace, PartialPromptTemplateVariableStart | PartialPromptTemplateVariable> {
    constructor(token: DollarSign);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialPromptTemplateVariableStart | PartialPromptTemplateVariable>;
}
/**
 * Parser that handles a partial `${variable}` token sequence in a prompt text.
 */
export declare class PartialPromptTemplateVariable extends ParserBase<TSimpleDecoderToken, PartialPromptTemplateVariable | PromptTemplateVariable> {
    constructor(tokens: (DollarSign | LeftCurlyBrace)[]);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialPromptTemplateVariable | PromptTemplateVariable>;
    /**
     * Returns a string representation of the prompt template variable
     * contents, if any is present.
     */
    private get contents();
    /**
     * Try to convert current parser instance into a {@link PromptTemplateVariable} token.
     *
     * @throws if:
     * 	- current tokens sequence cannot be converted to a valid template variable token
     */
    asPromptTemplateVariable(): PromptTemplateVariable;
}
