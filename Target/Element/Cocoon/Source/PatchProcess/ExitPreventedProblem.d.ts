/**
 * @module ExitPreventedProblem
 * @description Defines a custom, structured error that is thrown when an extension's
 * attempt to call `process.exit` is intercepted and blocked by the host's policy.
 */
declare const ExitPreventedProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ExitPreventedProblem";
} & Readonly<A>;
/**
 * @class ExitPreventedProblem
 * @description A structured, tagged error representing a blocked process termination attempt.
 * This error is thrown synchronously by the patched `process.exit` function
 * to halt the execution of the misbehaving extension code.
 */
export declare class ExitPreventedProblem extends ExitPreventedProblem_base<{
    /** A descriptive message explaining that the exit was blocked. */
    readonly message: string;
    /** The exit code that the extension attempted to use. */
    readonly AttemptedCode?: number;
}> {
}
export {};
