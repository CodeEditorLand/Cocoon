import { BaseToken } from '../../baseToken.js';
/**
 * Token representing a line of text with a `range` which
 * reflects the line's position in the original data.
 */
export declare class Line extends BaseToken {
    readonly text: string;
    constructor(lineNumber: number, text: string);
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
