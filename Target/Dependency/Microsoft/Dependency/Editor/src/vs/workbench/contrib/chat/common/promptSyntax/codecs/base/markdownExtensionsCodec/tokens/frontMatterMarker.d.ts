import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { NewLine } from '../../linesCodec/tokens/newLine.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
import { CarriageReturn } from '../../linesCodec/tokens/carriageReturn.js';
/**
 * Type for tokens inside a Front Matter header marker.
 */
export type TMarkerToken = Dash | CarriageReturn | NewLine;
/**
 * Marker for the start and end of a Front Matter header.
 */
export declare class FrontMatterMarker extends MarkdownExtensionsToken {
    readonly tokens: readonly TMarkerToken[];
    /**
     * Returns complete text representation of the token.
     */
    get text(): string;
    /**
     * List of {@link Dash} tokens in the marker.
     */
    get dashTokens(): readonly Dash[];
    constructor(range: Range, tokens: readonly TMarkerToken[]);
    /**
     * Create new instance of the token from a provided
     * list of tokens.
     */
    static fromTokens(tokens: readonly TMarkerToken[]): FrontMatterMarker;
    toString(): string;
}
