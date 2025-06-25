import { Colon, Word, Dash, SpacingToken } from '../../simpleCodec/tokens/tokens.js';
import { FrontMatterToken, FrontMatterValueToken, type TValueTypeName } from './frontMatterToken.js';
/**
 * Type for tokens that can be used inside a record name.
 */
export type TNameToken = Word | Dash;
/**
 * Token representing a `record name` inside a Front Matter record.
 *
 * E.g., `name` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export declare class FrontMatterRecordName extends FrontMatterToken<readonly TNameToken[]> {
    toString(): string;
}
/**
 * Token representing a delimiter of a record inside a Front Matter header.
 *
 * E.g., `: ` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export declare class FrontMatterRecordDelimiter extends FrontMatterToken<readonly [Colon, SpacingToken]> {
    toString(): string;
}
/**
 * Token representing a `record` inside a Front Matter header.
 *
 * E.g., `name: 'value'` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export declare class FrontMatterRecord extends FrontMatterToken<readonly [FrontMatterRecordName, FrontMatterRecordDelimiter, FrontMatterValueToken<TValueTypeName>]> {
    /**
     * Token that represent `name` of the record.
     *
     * E.g., `tools` in the example below:
     *
     * ```
     * ---
     * tools: ['value']
     * ---
     * ```
     */
    get nameToken(): FrontMatterRecordName;
    /**
     * Token that represent `value` of the record.
     *
     * E.g., `['value']` in the example below:
     *
     * ```
     * ---
     * tools: ['value']
     * ---
     * ```
     */
    get valueToken(): FrontMatterValueToken<TValueTypeName>;
    /**
     * Trim spacing tokens at the end of the record.
     */
    trimValueEnd(): readonly SpacingToken[];
    toString(): string;
}
