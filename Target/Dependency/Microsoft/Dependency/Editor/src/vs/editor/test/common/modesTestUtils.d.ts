import { StandardTokenType } from '../../common/encodedTokenAttributes.js';
import { ScopedLineTokens } from '../../common/languages/supports.js';
export interface TokenText {
    text: string;
    type: StandardTokenType;
}
export declare function createFakeScopedLineTokens(rawTokens: TokenText[]): ScopedLineTokens;
