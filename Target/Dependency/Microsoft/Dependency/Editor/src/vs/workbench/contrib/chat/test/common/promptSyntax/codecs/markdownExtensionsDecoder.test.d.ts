import { TestDecoder } from './base/utils/testDecoder.js';
import { type TChatPromptToken } from '../../../../common/promptSyntax/codecs/chatPromptDecoder.js';
import { MarkdownExtensionsDecoder } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/markdownExtensionsDecoder.js';
/**
 * Test decoder for the `MarkdownExtensionsDecoder` class.
 */
export declare class TestMarkdownExtensionsDecoder extends TestDecoder<TChatPromptToken, MarkdownExtensionsDecoder> {
    constructor();
}
