/**
 * @module IPCProblem
 * @description Defines a generic, tagged error for failures that occur during an
 * IPC request or notification.
 */
declare const IPCProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "IPCProblem";
} & Readonly<A>;
/**
 * @class IPCProblem
 * @description A generic error for failures during an IPC request or notification,
 * such as a network error or a failure to serialize/deserialize a message.
 */
export declare class IPCProblem extends IPCProblem_base<{
    readonly Cause: unknown;
    readonly Context: string;
}> {
}
export {};
