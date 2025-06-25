/**
 * @module StartDebuggingProblem
 * @description Defines a custom, tagged error for failures that occur when
 * attempting to start a debugging session.
 */
declare const StartDebuggingProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "StartDebuggingProblem";
} & Readonly<A>;
/**
 * @class StartDebuggingProblem
 * @description An error indicating that a `startDebugging` call failed. This
 * could be due to an invalid configuration, a failure to launch the debug
 * adapter, or an IPC communication issue.
 */
export declare class StartDebuggingProblem extends StartDebuggingProblem_base<{
    readonly Cause: unknown;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly Cause: unknown;
    });
}
export {};
