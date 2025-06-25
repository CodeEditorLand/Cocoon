import { TestDecoder } from '../utils/testDecoder.js';
import { type TSimpleDecoderToken } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/simpleDecoder.js';
import { FrontMatterDecoder } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/frontMatterDecoder.js';
/**
 * Front Matter decoder for testing purposes.
 */
export declare class TestFrontMatterDecoder extends TestDecoder<TSimpleDecoderToken, FrontMatterDecoder> {
    constructor();
}
