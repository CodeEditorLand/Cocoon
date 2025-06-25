import { URI } from '../../../../../../../base/common/uri.js';
import { TPromptReference } from '../../../../common/promptSyntax/parsers/types.js';
import { TErrorCondition } from '../../../../common/promptSyntax/parsers/basePromptParser.js';
/**
 * Options for the {@link ExpectedReference} class.
 */
interface IExpectedReferenceOptions {
    /**
     * Final `URI` of the reference.
     */
    readonly uri: URI;
    /**
     * Full text of the reference as it appears in the source text.
     */
    readonly text: string;
    /**
     * The `path` part of the reference (e.g., the `/abs/path/to/file.md`
     * part of the `[](/abs/path/to/file.md)` reference).
     */
    readonly path: string;
    /**
     * Start line of the reference in the source text. Because links cannot
     * contain line breaks, the end line number is also equal to this value.
     */
    readonly startLine: number;
    /**
     * Start column of the full reference text as it appears in the source text.
     */
    readonly startColumn: number;
    /**
     * Start column number of the `path` part of the reference.
     */
    readonly pathStartColumn: number;
    /**
     * Either an `error` that was generated during attempt to resolve this reference,
     * or a list of expected child references if the attempt was successful.
     */
    readonly childrenOrError?: TErrorCondition | ExpectedReference[];
}
/**
 * An expected child reference to use in tests.
 */
export declare class ExpectedReference {
    private readonly options;
    constructor(options: IExpectedReferenceOptions);
    /**
     * Validate that the provided reference is equal to this object.
     */
    validateEqual(other: TPromptReference): void;
    /**
     * Returns a string representation of the reference.
     */
    toString(): string;
}
export {};
