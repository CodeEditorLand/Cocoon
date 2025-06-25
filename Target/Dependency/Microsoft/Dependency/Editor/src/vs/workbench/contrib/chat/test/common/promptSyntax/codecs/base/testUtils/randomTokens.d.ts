import { Text } from '../../../../../../common/promptSyntax/codecs/base/textToken.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { Space, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
/**
 * Token type for the {@link cloneTokens} and {@link randomTokens} functions.
 */
type TToken = NewLine | Space | Word | Text<TToken[]>;
/**
 * Test utility to clone a list of provided tokens.
 */
export declare function cloneTokens(tokens: TToken[]): TToken[];
/**
 * Test utility to generate a number of random tokens.
 */
export declare function randomTokens(tokenCount?: number, startLine?: number, startColumn?: number): TToken[];
export {};
