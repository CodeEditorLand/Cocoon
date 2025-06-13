/**
 * @module ProvideHover (RPCHandlers)
 * @description Implements the RPC handler for providing hover information.
 */

import { Effect } from "effect";
import type { Hover, HoverProvider } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import { Tag as CancellationTokenTag } from "../../Cancellation/Service.js";
import { Tag as DocumentsTag } from "../../Document/Service.js";

/**
 * An Effect that handles the `$provideHover` RPC call from Mountain.
 * @param Registry - The Ref containing all registered providers.
 * @param Handle - The handle of the specific provider to invoke.
 * @param UriDTO - The URI DTO of the document.
 * @param PosDTO - The Position DTO.
 * @param TokenDTO - The CancellationToken DTO.
 * @returns An Effect that resolves to a Hover DTO or undefined.
 */
export const ProvideHover = (
	Registry: any,
	Handle: number,
	UriDTO: any,
	PosDTO: any,
	TokenDTO: any,
) =>
	Effect.gen(function* (_) {
		const Documents = yield* _(DocumentsTag);
		const Cancellation = yield* _(CancellationTokenTag);

		const Entry = (yield* _(Registry)).get(Handle);
		if (!Entry || Entry.type !== "Hover")
			throw new Error(
				`Provider not found or wrong type for handle ${Handle}`,
			);

		const Uri = TypeConverter.Uri.toAPI(UriDTO);
		const Document = yield* _(Documents.GetDocument(Uri));
		if (!Document)
			throw new Error(`Document not found for hover: ${Uri.toString()}`);

		// Obtain a scoped cancellation token
		const TokenData = yield* _(Cancellation.ObtainToken(TokenDTO.id));

		const Position = TypeConverter.Position.toAPI(PosDTO);
		const Provider = Entry.provider as HoverProvider;

		const Result = yield* _(
			Effect.tryPromise(() =>
				Provider.provideHover(Document, Position, TokenData.Token),
			),
		);

		// Assuming CommandConverter is available in this scope
		const CommandConverter = {} as any;
		return TypeConverter.Hover.fromAPI(Result as Hover, CommandConverter);
	}).pipe(
		Effect.scoped, // Ensures the cancellation token's scope is properly handled
		Effect.catchAll(() => Effect.succeed(undefined)), // Return undefined on any failure
	);
