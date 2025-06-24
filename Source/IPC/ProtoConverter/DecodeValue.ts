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
export const DecodeValue = (
	ProtoValueInstance?: ProtoValue,
): Effect.Effect<any, ProtoSerializationProblem> => {
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
			new ProtoSerializationProblem({
				Cause: cause,
				Direction: "Decoding",
			}),
	});
};
