import { PromptAtMention } from './tokens/promptAtMention.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { PromptSlashCommand } from './tokens/promptSlashCommand.js';
import { ReadableStream } from '../../../../../../base/common/stream.js';
import { PromptTemplateVariable } from './tokens/promptTemplateVariable.js';
import { BaseDecoder } from './base/baseDecoder.js';
import { PromptVariable, PromptVariableWithData } from './tokens/promptVariable.js';
import { TMarkdownToken } from './base/markdownCodec/markdownDecoder.js';
/**
 * Tokens produced by this decoder.
 */
export type TChatPromptToken = TMarkdownToken | (PromptVariable | PromptVariableWithData) | PromptAtMention | PromptSlashCommand | PromptTemplateVariable;
/**
 * Decoder for the common chatbot prompt message syntax.
 * For instance, the file references `#file:./path/file.md` are handled by this decoder.
 */
export declare class ChatPromptDecoder extends BaseDecoder<TChatPromptToken, TMarkdownToken> {
    /**
     * Currently active parser object that is used to parse a well-known sequence of
     * tokens, for instance, a `#file:/path/to/file.md` link that consists of `hash`,
     * `word`, and `colon` tokens sequence plus the `file path` part that follows.
     */
    private current?;
    constructor(stream: ReadableStream<VSBuffer>);
    protected onStreamData(token: TMarkdownToken): void;
    protected onStreamEnd(): void;
    /**
     * Re-emit tokens accumulated so far in the current parser object.
     */
    protected reEmitCurrentTokens(): void;
}
