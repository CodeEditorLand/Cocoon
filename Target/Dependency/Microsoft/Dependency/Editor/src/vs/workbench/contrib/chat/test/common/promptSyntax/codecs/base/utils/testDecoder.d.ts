import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { Disposable } from '../../../../../../../../../base/common/lifecycle.js';
import { WriteableStream } from '../../../../../../../../../base/common/stream.js';
import { BaseDecoder } from '../../../../../../common/promptSyntax/codecs/base/baseDecoder.js';
import { BaseToken } from '../../../../../../common/promptSyntax/codecs/base/baseToken.js';
/**
 * Kind of decoder tokens consume methods are different ways
 * consume tokens that a decoder produces out of a byte stream.
 */
export type TTokensConsumeMethod = 'async-generator' | 'consume-all-method' | 'on-data-event';
/**
 * A reusable test utility that asserts that the given decoder
 * produces the expected `expectedTokens` sequence of tokens.
 *
 * ## Examples
 *
 * ```typescript
 * const stream = newWriteableStream<VSBuffer>(null);
 * const decoder = testDisposables.add(new LinesDecoder(stream));
 *
 * // create a new test utility instance
 * const test = testDisposables.add(new TestDecoder(stream, decoder));
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 * 	   new Line(1, ' hello world'),
 * 	   new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export declare class TestDecoder<T extends BaseToken, D extends BaseDecoder<T>> extends Disposable {
    private readonly stream;
    readonly decoder: D;
    constructor(stream: WriteableStream<VSBuffer>, decoder: D);
    /**
     * Write provided {@linkcode inputData} data to the input byte stream
     * asynchronously in the background in small random-length chunks.
     *
     * @param inputData Input data to send.
     */
    sendData(inputData: string | string[]): this;
    /**
     * Run the test sending the `inputData` data to the stream and asserting
     * that the decoder produces the `expectedTokens` sequence of tokens.
     *
     * @param inputData Input data of the input byte stream.
     * @param expectedTokens List of expected tokens the test token must produce.
     * @param tokensConsumeMethod *Optional* method of consuming the decoder stream.
     *       					  Defaults to a random method (see {@linkcode randomTokensConsumeMethod}).
     */
    run(inputData: string | string[], expectedTokens: readonly T[], tokensConsumeMethod?: TTokensConsumeMethod): Promise<void>;
    /**
     * Randomly generate a tokens consume method type for the test.
     */
    private randomTokensConsumeMethod;
    /**
     * Receive all tokens from the decoder stream using the specified consume method.
     */
    receiveTokens(tokensConsumeMethod?: TTokensConsumeMethod): Promise<readonly T[]>;
    /**
     * Validate that received tokens list is equal to the expected one.
     */
    private validateReceivedTokens;
}
