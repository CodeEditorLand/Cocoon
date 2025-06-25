import { Range } from '../../../../../../../editor/common/core/range.js';
/**
 * List of all currently supported diagnostic types.
 */
export type TDiagnostic = PromptMetadataWarning | PromptMetadataError;
/**
 * Diagnostics object that hold information about some issue
 * related to the prompt header metadata.
 */
export declare abstract class PromptMetadataDiagnostic {
    readonly range: Range;
    readonly message: string;
    constructor(range: Range, message: string);
    /**
     * String representation of the diagnostic object.
     */
    abstract toString(): string;
}
/**
 * Diagnostics object that hold information about some
 * non-fatal issue related to the prompt header metadata.
 */
export declare class PromptMetadataWarning extends PromptMetadataDiagnostic {
    toString(): string;
}
/**
 * Diagnostics object that hold information about some
 * fatal issue related to the prompt header metadata.
 */
export declare class PromptMetadataError extends PromptMetadataDiagnostic {
    toString(): string;
}
