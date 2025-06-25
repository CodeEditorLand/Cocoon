/**
 * @module InvalidTokenIdProblem
 * @description Defines a custom, tagged error for when an invalid token ID
 * is provided to the Cancellation service.
 */
declare const InvalidTokenIdProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "InvalidTokenIdProblem";
} & Readonly<A>;
/**
 * @class InvalidTokenIdProblem
 * @description A tagged error indicating that an invalid token ID was provided.
 * Cancellation tokens are identified by positive integers.
 */
export declare class InvalidTokenIdProblem extends InvalidTokenIdProblem_base<{
    readonly TokenId: number;
}> {
    readonly message: string;
    constructor(Properties: {
        readonly TokenId: number;
    });
}
export {};
