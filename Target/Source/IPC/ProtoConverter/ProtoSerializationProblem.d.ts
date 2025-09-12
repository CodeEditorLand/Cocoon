/**
 * @module ProtoSerializationProblem
 * @description Defines a custom, tagged error for failures during conversion between
 * JavaScript values and Google Protobuf `Value` types.
 */
declare const ProtoSerializationProblem_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ProtoSerializationProblem";
} & Readonly<A>;
/**
 * @class ProtoSerializationProblem
 * @description A tagged error representing a failure during the conversion between a
 * JavaScript value and a Google Protobuf `Value` type.
 */
export declare class ProtoSerializationProblem extends ProtoSerializationProblem_base<{
    readonly Cause: unknown;
    readonly Direction: "Encoding" | "Decoding";
}> {
    readonly message: string;
    constructor(Properties: {
        readonly Cause: unknown;
        readonly Direction: "Encoding" | "Decoding";
    });
}
export {};
//# sourceMappingURL=ProtoSerializationProblem.d.ts.map