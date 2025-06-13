/**
 * @module ProvideHover (LanguageFeature/RPCHandlers)
 * @description Implements the RPC handler for providing hover information.
 */

import { Effect } from "effect";
import type { Hover, HoverProvider, Position, Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import { Cancellation } from "../../Cancellation/Service.js";
import { Document } from "../../Document/Service.js";

/**
 * An Effect that handles the `$provideHover` RPC call from Mountain.
 * @param Registry A Ref containing all registered language providers.
 * @param Handle The handle of the specific provider to invoke.
 * @param UriDTO The URI DTO of the document.
 * @param PosDTO The Position DTO.
 * @param TokenID The ID of the cancellation token.
 * @returns An `Effect` that resolves to a Hover DTO or undefined.
 */
export function ProvideHover(
	Registry: Effect.Ref<Map<number, any>>,
	Handle: number,
	UriDTO: any,
	PosDTO: any,
	TokenID: number,
) {
	return Effect.gen(function* (_) {
		const DocumentService = yield* _(Document.Tag);
		const CancellationService = yield* _(Cancellation.Tag);

		const Entry = (yield* _(Ref.get(Registry))).get(Handle);
		if (!Entry) {
			return yield* _(
				Effect.fail(
					new Error(`Provider not found for handle ${Handle}`),
				),
			);
		}

		const revivedURI = TypeConverter.URIConverter.ToAPI(UriDTO);
		const document = yield* _(DocumentService.GetDocument(revivedURI));
		if (!document) {
			return yield* _(
				Effect.fail(
					new Error(
						`Document not found for hover: ${revivedURI.toString()}`,
					),
				),
			);
		}

		const { Token } = yield* _(CancellationService.ObtainToken(TokenID));
		const revivedPosition = TypeConverter.PositionConverter.ToAPI(PosDTO);
		const provider = Entry.provider as HoverProvider;

		const result = yield* _(
			Effect.tryPromise(() =>
				provider.provideHover(document, revivedPosition, Token),
			),
		);

		if (!result) {
			return undefined;
		}

		// The command converter would be injected in a real scenario
		const commandConverter = new TypeConverter.Command.Definition(
			{} as any,
			() => undefined,
		);
		return TypeConverter.Hover.fromAPI(result as Hover, commandConverter);
	}).pipe(
		Effect.scoped, // Ensures the cancellation token's scope is properly handled
		Effect.catchAll(() => Effect.succeed(undefined)), // Return undefined on any failure
	);
}
