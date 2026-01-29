/**
 * @module DecodeValue
 * @description Contains an Effect-based function to decode a
 * `google.protobuf.Value` into a JavaScript value.
 */
import { Effect } from "effect";
import { Value as ProtoValue } from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationProblem } from "./ProtoSerializationProblem.js";
/**
 * @description An Effect that converts a `google.protobuf.Value` back into a JavaScript value.
 * @param ProtoValueInstance The Protobuf Value to decode.
 * @returns An `Effect` that resolves to the corresponding JavaScript value,
 *   or fails with a `ProtoSerializationProblem`.
 */
export declare const DecodeValue: (ProtoValueInstance?: ProtoValue) => Effect.Effect<any, ProtoSerializationProblem>;
//# sourceMappingURL=DecodeValue.d.ts.map