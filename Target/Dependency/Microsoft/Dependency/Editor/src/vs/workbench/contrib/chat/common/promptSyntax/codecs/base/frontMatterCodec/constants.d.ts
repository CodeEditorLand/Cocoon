import { NewLine } from '../linesCodec/tokens/newLine.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { FormFeed, SpacingToken } from '../simpleCodec/tokens/tokens.js';
/**
 * List of valid "space" tokens that are valid between different
 * records of a Front Matter header.
 */
export declare const VALID_INTER_RECORD_SPACING_TOKENS: readonly (typeof SpacingToken | typeof FormFeed | typeof NewLine | typeof CarriageReturn)[];
