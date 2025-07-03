/**
 * @module Problem
 * @description Defines a placeholder for the IntegrationPathProblem type.
 * This file is a stub to resolve import errors. A real implementation would
 * define concrete error types from the Tauri integration layer.
 */
declare const IntegrationPathProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "IntegrationPathProblem";
} & Readonly<A>;
/**
 * @class IntegrationPathProblem
 * @description A placeholder error type for path-related failures at the
 * integration layer.
 */
export declare class IntegrationPathProblem extends IntegrationPathProblem_base<{
    readonly Cause?: unknown;
}> {
}
export {};
//# sourceMappingURL=Problem.d.ts.map