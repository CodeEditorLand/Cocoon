/**
 * @module EncodeValue
 * @description Contains an Effect-based function to encode a JavaScript value into a
 * `google.protobuf.Value`.
 */
import { Effect } from "effect";
import { Value as ProtoValue } from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationProblem } from "./ProtoSerializationProblem.js";
/**
 * @description An Effect that converts a JavaScript value into a `google.protobuf.Value`.
 * @param JavaScriptValue The JavaScript value to encode.
 * @returns An `Effect` that resolves to a `ProtoValue` or fails with a `ProtoSerializationProblem`.
 */
export declare const EncodeValue: (JavaScriptValue: any) => Effect.Effect<ProtoValue, ProtoSerializationProblem>;
