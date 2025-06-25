import { TestDecoder } from './base/utils/testDecoder.js';
import { ChatPromptDecoder, TChatPromptToken } from '../../../../common/promptSyntax/codecs/chatPromptDecoder.js';
/**
 * A reusable test utility that asserts that a `ChatPromptDecoder` instance
 * correctly decodes `inputData` into a stream of `TChatPromptToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestChatPromptCodec());
 *
 * // run the test
 * await test.run(
 *   ' hello #file:./some-file.md world\n',
 *   [
 *     new PromptVariableWithData(
 *       new Range(1, 8, 1, 28),
 *       'file',
 *       './some-file.md',
 *     ),
 *   ]
 * );
 */
export declare class TestChatPromptCodec extends TestDecoder<TChatPromptToken, ChatPromptDecoder> {
    constructor();
}
