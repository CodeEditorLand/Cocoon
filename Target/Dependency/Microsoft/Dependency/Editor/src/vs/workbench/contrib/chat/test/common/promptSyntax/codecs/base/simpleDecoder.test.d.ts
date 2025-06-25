import { TestDecoder } from './utils/testDecoder.js';
import { SimpleDecoder, TSimpleDecoderToken } from '../../../../../common/promptSyntax/codecs/base/simpleCodec/simpleDecoder.js';
/**
 * A reusable test utility that asserts that a `SimpleDecoder` instance
 * correctly decodes `inputData` into a stream of `TSimpleToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestSimpleDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 *     new Space(new Range(1, 1, 1, 2)),
 *     new Word(new Range(1, 2, 1, 7), 'hello'),
 *     new Space(new Range(1, 7, 1, 8)),
 *     new Word(new Range(1, 8, 1, 13), 'world'),
 *     new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export declare class TestSimpleDecoder extends TestDecoder<TSimpleDecoderToken, SimpleDecoder> {
    constructor();
}
