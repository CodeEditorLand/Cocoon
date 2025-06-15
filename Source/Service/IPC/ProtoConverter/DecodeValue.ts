/**
 * @module DecodeValue
 * @description An Effect-based function to decode a `google.protobuf.Value`
 * into a JavaScript value.
 */

import { Effect } from "effect";
import { Value as ProtoValue } from "google-protobuf/google/protobuf/struct_pb.js";

import { ProtoSerializationError } from "./Error.js";

/**
 * An Effect that converts a `google.protobuf.Value` back into a JavaScript value.
 * This safely handles `null` and `undefined` and wraps the potentially-throwing
 * `toJavaScript` call in a typed error.
 *
 * @param ProtoValueInstance The Protobuf Value to decode.
 * @returns An `Effect` that resolves to the corresponding JavaScript value,
 *   or fails with a `ProtoSerializationError`.
 */
const DecodeValue = (
	ProtoValueInstance?: ProtoValue,
): Effect.Effect<any, ProtoSerializationError> => {
	return Effect.try({
		try: () => {
			if (ProtoValueInstance === undefined) {
				return undefined;
			}
			if (
				ProtoValueInstance.getKindCase() ===
				ProtoValue.KindCase.NULL_VALUE
			) {
				return null;
			}
			return ProtoValueInstance.toJavaScript();
		},
		catch: (cause) =>
			new ProtoSerializationError({
				cause: cause,
				Direction: "Decoding",
			}),
	});
};

export default DecodeValue;
