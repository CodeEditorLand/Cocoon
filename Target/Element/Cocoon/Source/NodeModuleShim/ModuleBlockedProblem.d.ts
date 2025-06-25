/**
 * @module ModuleBlockedProblem
 * @description Defines a custom, tagged error for when an extension attempts
 * to require a Node.js module that is explicitly blocked by the host.
 */
declare const ModuleBlockedProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ModuleBlockedProblem";
} & Readonly<A>;
/**
 * @class ModuleBlockedProblem
 * @description An error indicating that an extension attempted to require a
 * built-in Node.js module that is explicitly blocked by the host for security
 * or stability reasons.
 */
export declare class ModuleBlockedProblem extends ModuleBlockedProblem_base<{
    readonly ModuleName: string;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly ModuleName: string;
    });
}
export {};
