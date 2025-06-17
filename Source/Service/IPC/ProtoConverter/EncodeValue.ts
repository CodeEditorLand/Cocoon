/*
 * File: Cocoon/Source/Service/IPC/ProtoConverter/EncodeValue.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:19 UTC
 * Dependency: ./Error/ProtoSerializationError.js, effect
 */

/**
 * @module EncodeValue
 * @description An Effect-based function to encode a JavaScript value into a
 * `google.protobuf.Value`.
 */

import { Effect } from "effect";
import {
	NullValue,
	Value as ProtoValue,
} from "google-protobuf/google/protobuf/struct_pb.js";

import ProtoSerializationError from "./Error/ProtoSerializationError.js";

/**
 * An Effect that converts a JavaScript value into a `google.protobuf.Value`.
 * This safely handles `null` and `undefined` and wraps the potentially-throwing
 * `fromJavaScript` call in a typed error.
 *
 * @param JsValue The JavaScript value to encode.
 * @returns An `Effect` that resolves to a `ProtoValue` or fails with a `ProtoSerializationError`.
 */
export default (
	JsValue: any,
): Effect.Effect<ProtoValue, ProtoSerializationError> => {
	return Effect.try({
		try: () => {
			if (JsValue === undefined) {
				// According to Protobuf `Value` spec, `undefined` should be treated as `null`.
				const Value = new ProtoValue();
				Value.setNullValue(NullValue.NULL_VALUE);
				return Value;
			}
			return ProtoValue.fromJavaScript(JsValue);
		},
		catch: (cause) =>
			new ProtoSerializationError({
				cause,
				Direction: "Encoding",
			}),
	});
};
