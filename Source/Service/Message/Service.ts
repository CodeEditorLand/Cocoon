/*
 * File: Cocoon/Source/Service/Message/Service.ts
 * Role: Defines the Message service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for showing notifications (`showInformationMessage`, etc.).
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import { IPC as IPCService } from "../IPC/Service.js";

// --- Internal Types and Helpers ---
interface ExtensionSource {
	readonly id: string | ExtensionIdentifier;
	readonly displayName: string;
}

interface ParsedArguments {
	readonly Option: MessageOptions;
	readonly Items: (string | MessageItem)[];
	readonly Source?: ExtensionSource;
}

const ParseArgument = (Arguments: any[]): ParsedArguments => {
	let Option: MessageOptions = {};
	let Items: (string | MessageItem)[] = [];
	let Source: ExtensionSource | undefined = undefined;
	let CurrentIndex = 0;

	if (
		Arguments.length > CurrentIndex &&
		typeof Arguments[CurrentIndex] === "object" &&
		Arguments[CurrentIndex] !== null &&
		!(Arguments[CurrentIndex] as MessageItem).title &&
		!(Arguments[CurrentIndex] as ExtensionSource).id
	) {
		Option = Arguments[CurrentIndex++];
	}
	if (
		Arguments.length > CurrentIndex &&
		typeof Arguments[CurrentIndex] === "object" &&
		Arguments[CurrentIndex] !== null &&
		typeof (Arguments[CurrentIndex] as ExtensionSource).id === "string"
	) {
		Source = Arguments[CurrentIndex++];
	}
	Items = Arguments.slice(CurrentIndex).filter(
		(item): item is string | MessageItem =>
			typeof item === "string" ||
			(typeof item === "object" &&
				item !== null &&
				typeof item.title === "string"),
	);

	return { Option, Items, Source };
};

const CreateShowMessageEffect = <T extends MessageItem>(
	IPC: IPCService,
	Severity: number, // Corresponds to vs/base/common/severity
	Message: string,
	Option: MessageOptions,
	Items: (string | T)[],
	Source: ExtensionSource | undefined,
): Effect.Effect<T | undefined, Error> => {
	return Effect.gen(function* (Generator) {
		const ItemsForIPC = Items.map((item, index) => ({
			title: typeof item === "string" ? item : item.title,
			isCloseAffordance:
				typeof item === "object"
					? !!(item as T).isCloseAffordance
					: false,
			handle: index,
		}));
		const DTO = {
			severity: Severity,
			message: Message,
			options: { modal: Option.modal, detail: Option.detail },
			items: ItemsForIPC,
			source: Source
				? {
						identifier:
							typeof Source.id === "string"
								? Source.id
								: Source.id.value,
						name: Source.displayName,
					}
				: undefined,
		};
		const ResultHandle = yield* Generator(
			IPC.SendRequest<number | undefined>("$showMessage", [
				DTO.severity,
				DTO.message,
				DTO.options,
				DTO.items,
				DTO.source,
			]).pipe(Effect.mapError((cause) => new Error(String(cause)))),
		);
		if (ResultHandle === undefined || ResultHandle === null)
			return undefined;
		if (ResultHandle >= 0 && ResultHandle < Items.length) {
			const ResultItem = Items[ResultHandle];
			if (typeof ResultItem !== "string") return ResultItem as T;
		}
		return undefined;
	});
};

// --- Service Definition ---
export class Message extends Effect.Service<Message>()("Service/Message", {
	effect: Effect.gen(function* (Generator) {
		const IPC = yield* Generator(IPCService);
		return {
			ShowInformationMessage: (message, ...args) => {
				const { Option, Items, Source } = ParseArgument(args);
				return CreateShowMessageEffect(
					IPC,
					1,
					message,
					Option,
					Items,
					Source,
				) as any;
			},
			ShowWarningMessage: (message, ...args) => {
				const { Option, Items, Source } = ParseArgument(args);
				return CreateShowMessageEffect(
					IPC,
					2,
					message,
					Option,
					Items,
					Source,
				) as any;
			},
			ShowErrorMessage: (message, ...args) => {
				const { Option, Items, Source } = ParseArgument(args);
				return CreateShowMessageEffect(
					IPC,
					3,
					message,
					Option,
					Items,
					Source,
				) as any;
			},
		};
	}),
}) {}
