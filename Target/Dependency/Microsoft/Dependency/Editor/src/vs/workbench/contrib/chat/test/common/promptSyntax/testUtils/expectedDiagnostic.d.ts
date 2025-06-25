import { PromptMetadataDiagnostic, TDiagnostic } from '../../../../common/promptSyntax/parsers/promptHeader/diagnostics.js';
/**
 * Base class for all expected diagnostics used in the unit tests.
 */
declare abstract class ExpectedDiagnostic extends PromptMetadataDiagnostic {
    /**
     * Validate that the provided diagnostic is equal to this object.
     */
    validateEqual(other: TDiagnostic): void;
    /**
     * Validate that the provided diagnostic is of the same
     * diagnostic type as this object.
     */
    private validateTypesEqual;
}
/**
 * Expected warning diagnostic object for testing purposes.
 */
export declare class ExpectedDiagnosticWarning extends ExpectedDiagnostic {
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
/**
 * Expected error diagnostic object for testing purposes.
 */
export declare class ExpectedDiagnosticError extends ExpectedDiagnostic {
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
/**
 * Type for any expected diagnostic object.
 */
export type TExpectedDiagnostic = ExpectedDiagnosticWarning | ExpectedDiagnosticError;
export {};
