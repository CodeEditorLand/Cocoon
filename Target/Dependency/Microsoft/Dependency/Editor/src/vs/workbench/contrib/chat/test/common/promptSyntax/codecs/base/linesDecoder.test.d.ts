import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { TestDecoder } from './utils/testDecoder.js';
import { WriteableStream } from '../../../../../../../../base/common/stream.js';
import { LinesDecoder, TLineToken } from '../../../../../common/promptSyntax/codecs/base/linesCodec/linesDecoder.js';
/**
 * A reusable test utility that asserts that a `LinesDecoder` instance
 * correctly decodes `inputData` into a stream of `TLineToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = disposables.add(new TestLinesDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 *     new Line(1, ' hello world'),
 *     new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export declare class TestLinesDecoder extends TestDecoder<TLineToken, LinesDecoder> {
    constructor(inputStream?: WriteableStream<VSBuffer>);
}
