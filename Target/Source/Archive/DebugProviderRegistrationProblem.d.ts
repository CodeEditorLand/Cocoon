/**
 * @module DebugProviderRegistrationProblem
 * @description Defines a custom, tagged error for failures that occur during
 * the registration of a debug provider.
 */
declare const DebugProviderRegistrationProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "DebugProviderRegistrationProblem";
} & Readonly<A>;
/**
 * @class DebugProviderRegistrationProblem
 * @description An error indicating that a debug provider (e.g., a configuration
 * provider or debug adapter factory) failed to register with the host process.
 */
export declare class DebugProviderRegistrationProblem extends DebugProviderRegistrationProblem_base<{
    readonly DebugType: string;
    readonly Cause?: unknown;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly DebugType: string;
        readonly Cause?: unknown;
    });
}
export {};
//# sourceMappingURL=DebugProviderRegistrationProblem.d.ts.map