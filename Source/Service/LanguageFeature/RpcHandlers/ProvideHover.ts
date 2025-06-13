/**
 * @module ProvideHover (RpcHandlers)
 * @description Implements the RPC handler for providing hover information.
 */

import { Effect } from "effect";
import type { Hover, HoverProvider } from "vscode";

import * as TypeConverter from "../../../TypeConverter/mod.js";
import { Tag as CancellationTokenTag } from "../../Cancellation/Service.js";
import { Tag as DocumentsTag } from "../../Document/Service.js";

/**
 * An Effect that handles the `$provideHover` RPC call from Mountain.
 * @param Registry - The Ref containing all registered providers.
 * @param Handle - The handle of the specific provider to invoke.
 * @param UriDto - The URI DTO of the document.
 * @param PosDto - The Position DTO.
 * @param TokenDto - The CancellationToken DTO.
 * @returns An Effect that resolves to a Hover DTO or undefined.
 */
export const ProvideHover = (
	Registry: any,
	Handle: number,
	UriDto: any,
	PosDto: any,
	TokenDto: any,
) =>
	Effect.gen(function* (_) {
		const Documents = yield* _(DocumentsTag);
		const Cancellation = yield* _(CancellationTokenTag);

		const Entry = (yield* _(Registry)).get(Handle);
		if (!Entry || Entry.type !== "Hover")
			throw new Error(
				`Provider not found or wrong type for handle ${Handle}`,
			);

		const Uri = TypeConverter.Uri.toApi(UriDto);
		const Document = yield* _(Documents.GetDocument(Uri));
		if (!Document)
			throw new Error(`Document not found for hover: ${Uri.toString()}`);

		// Obtain a scoped cancellation token
		const TokenData = yield* _(Cancellation.ObtainToken(TokenDto.id));

		const Position = TypeConverter.Position.toApi(PosDto);
		const Provider = Entry.provider as HoverProvider;

		const Result = yield* _(
			Effect.tryPromise(() =>
				Provider.provideHover(Document, Position, TokenData.Token),
			),
		);

		// Assuming CommandsConverter is available in this scope
		const CommandsConverter = {} as any;
		return TypeConverter.Hover.fromApi(Result as Hover, CommandsConverter);
	}).pipe(
		Effect.scoped, // Ensures the cancellation token's scope is properly handled
		Effect.catchAll(() => Effect.succeed(undefined)), // Return undefined on any failure
	);
