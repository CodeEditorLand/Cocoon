/**
 * @module DialogProblem
 * @description Defines a custom, tagged error for failures that occur
 * during a dialog operation (e.g., showOpenDialog).
 */
declare const DialogProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "DialogProblem";
} & Readonly<A>;
/**
 * @class DialogProblem
 * @description An error indicating that a dialog operation failed. This is a generic
 * wrapper for IPC or other underlying errors, providing context for debugging.
 */
export declare class DialogProblem extends DialogProblem_base<{
    readonly Cause: unknown;
    readonly Context: string;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly Cause: unknown;
        readonly Context: string;
    });
}
export {};
//# sourceMappingURL=DialogProblem.d.ts.map