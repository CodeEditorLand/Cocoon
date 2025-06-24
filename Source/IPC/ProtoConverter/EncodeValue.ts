/**
 * @module EncodeValue
 * @description Contains an Effect-based function to encode a JavaScript value into a
 * `google.protobuf.Value`.
 */

import { Effect } from "effect";
import {
	NullValue,
	Value as ProtoValue,
} from "google-protobuf/google/protobuf/struct_pb.js";
import { ProtoSerializationProblem } from "./ProtoSerializationProblem.js";

/**
 * @description An Effect that converts a JavaScript value into a `google.protobuf.Value`.
 * @param JavaScriptValue The JavaScript value to encode.
 * @returns An `Effect` that resolves to a `ProtoValue` or fails with a `ProtoSerializationProblem`.
 */
export const EncodeValue = (
	JavaScriptValue: any,
): Effect.Effect<ProtoValue, ProtoSerializationProblem> => {
	return Effect.try({
		try: () => {
			if (JavaScriptValue === undefined) {
				const Value = new ProtoValue();
				Value.setNullValue(NullValue.NULL_VALUE);
				return Value;
			}
			return ProtoValue.fromJavaScript(JavaScriptValue);
		},
		catch: (cause) =>
			new ProtoSerializationProblem({
				Cause: cause,
				Direction: "Encoding",
			}),
	});
};
