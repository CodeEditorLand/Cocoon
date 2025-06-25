import { LanguageId, StandardTokenType } from '../../../../common/encodedTokenAttributes.js';
import { ITokenizationSupport } from '../../../../common/languages.js';
export declare class TokenizedDocument {
    private readonly tokensByLine;
    constructor(tokens: TokenInfo[]);
    getText(): string;
    getTokenizationSupport(): ITokenizationSupport;
}
export declare class TokenInfo {
    readonly text: string;
    readonly languageId: LanguageId;
    readonly tokenType: StandardTokenType;
    readonly hasBalancedBrackets: boolean;
    constructor(text: string, languageId: LanguageId, tokenType: StandardTokenType, hasBalancedBrackets: boolean);
    getMetadata(): number;
    withText(text: string): TokenInfo;
}
