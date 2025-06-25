import { IViewLineTokens } from '../../../common/tokens/lineTokens.js';
import { ColorId, ITokenPresentation, StandardTokenType } from '../../../common/encodedTokenAttributes.js';
import { ILanguageIdCodec } from '../../../common/languages.js';
/**
 * A token on a line.
 */
export declare class TestLineToken {
    /**
     * last char index of this token (not inclusive).
     */
    readonly endIndex: number;
    private readonly _metadata;
    constructor(endIndex: number, metadata: number);
    getStandardTokenType(): StandardTokenType;
    getForeground(): ColorId;
    getType(): string;
    getInlineStyle(colorMap: string[]): string;
    getPresentation(): ITokenPresentation;
    private static _equals;
    static equalsArr(a: TestLineToken[], b: TestLineToken[]): boolean;
}
export declare class TestLineTokens implements IViewLineTokens {
    private readonly _actual;
    constructor(actual: TestLineToken[]);
    equals(other: IViewLineTokens): boolean;
    getCount(): number;
    getStandardTokenType(tokenIndex: number): StandardTokenType;
    getForeground(tokenIndex: number): ColorId;
    getEndOffset(tokenIndex: number): number;
    getClassName(tokenIndex: number): string;
    getInlineStyle(tokenIndex: number, colorMap: string[]): string;
    getPresentation(tokenIndex: number): ITokenPresentation;
    findTokenIndexAtOffset(offset: number): number;
    getLineContent(): string;
    getMetadata(tokenIndex: number): number;
    getLanguageId(tokenIndex: number): string;
    getTokenText(tokenIndex: number): string;
    forEach(callback: (tokenIndex: number) => void): void;
    get languageIdCodec(): ILanguageIdCodec;
}
export declare class TestLineTokenFactory {
    static inflateArr(tokens: Uint32Array): TestLineToken[];
}
