/**
 * @module ModuleNotShimmedProblem
 * @description Defines a custom error for when an extension attempts to require
 * a Node.js module for which no safe shim has been implemented.
 */
declare const ModuleNotShimmedProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ModuleNotShimmedProblem";
} & Readonly<A>;
/**
 * @class ModuleNotShimmedProblem
 * @description An error indicating that an extension attempted to require a
 * built-in Node.js module for which no safe, sandboxed shim has been implemented.
 */
export declare class ModuleNotShimmedProblem extends ModuleNotShimmedProblem_base<{
    readonly ModuleName: string;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly ModuleName: string;
    });
}
export {};
