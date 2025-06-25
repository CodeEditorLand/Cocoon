/**
 * @module gRPCConnectionError
 * @description Defines a structured error for failures during a gRPC connection
 * attempt or server setup.
 */
declare const gRPCConnectionError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "gRPCConnectionError";
} & Readonly<A>;
/**
 * @class gRPCConnectionError
 * @description A structured, tagged error indicating a failure during a gRPC
 * connection attempt or server setup. It captures the underlying `Cause` and
 * provides a `Context` string to indicate which part of the connection process failed.
 */
export declare class gRPCConnectionError extends gRPCConnectionError_base<{
    readonly Cause: unknown;
    readonly Context: "ProtoLoadFailed" | "ClientInstantiationFailed" | "ClientNotReady" | "ServerBindFailed" | "ServerStartFailed" | "ServerShutdownFailed";
}> {
}
export {};
