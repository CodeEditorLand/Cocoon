/**
 * @module Message
 * @description Defines the service for showing user-facing notifications
 * (`showInformationMessage`, `showWarningMessage`, `showErrorMessage`).
 */

import type { ExtensionIdentifier } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

import { IPCService, type IPC } from "./IPC.js";

// Internal Types
interface ExtensionSource {
	readonly id: string | ExtensionIdentifier;
	readonly displayName: string;
}
interface ParsedArguments {
	readonly Option: MessageOptions;
	readonly Items: (string | MessageItem)[];
}

// Internal Helpers
const ParseArgument = (Arguments: any[]): ParsedArguments => {
	let Option: MessageOptions = {};
	let Items: (string | MessageItem)[] = [];
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
	// FIX: Removed unused 'Source' parsing logic.
	Items = Arguments.slice(CurrentIndex).filter(
		(item): item is string | MessageItem =>
			typeof item === "string" ||
			(typeof item === "object" &&
				item !== null &&
				typeof item.title === "string"),
	);
	return { Option, Items };
};

const CreateShowMessageEffect = <T extends MessageItem>(
	IPC: IPC,
	Severity: number, // Corresponds to vs/base/common/severity
	Message: string,
	Option: MessageOptions,
	Items: (string | T)[],
	Source: ExtensionSource | undefined,
): Effect.Effect<T | undefined, Error> => {
	return Effect.gen(function* () {
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
		const ResultHandle = yield* IPC.SendRequest<number | undefined>(
			"$showMessage",
			[DTO.severity, DTO.message, DTO.options, DTO.items, DTO.source],
		).pipe(Effect.mapError((cause) => new Error(String(cause))));
		if (ResultHandle === undefined || ResultHandle === null)
			return undefined;
		if (ResultHandle >= 0 && ResultHandle < Items.length) {
			const ResultItem = Items[ResultHandle];
			if (typeof ResultItem !== "string") return ResultItem as T;
		}
		return undefined;
	});
};

/**
 * @interface Message
 * @description The contract for the Message service.
 */
export interface Message {
	readonly ShowInformationMessage: <T extends MessageItem>(
		message: string,
		...args: Array<string | T | MessageOptions>
	) => Effect.Effect<T | undefined, Error>;
	readonly ShowWarningMessage: <T extends MessageItem>(
		message: string,
		...args: Array<string | T | MessageOptions>
	) => Effect.Effect<T | undefined, Error>;
	readonly ShowErrorMessage: <T extends MessageItem>(
		message: string,
		...args: Array<string | T | MessageOptions>
	) => Effect.Effect<T | undefined, Error>;
}

/**
 * @class MessageService
 * @description The `Effect.Service` for showing user-facing messages.
 */
export class MessageService extends Effect.Service<MessageService>()(
	"Service/Message",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			return {
				ShowInformationMessage: <T extends MessageItem>(
					message: string,
					...args: Array<string | T | MessageOptions>
				) => {
					const { Option, Items } = ParseArgument(args);
					return CreateShowMessageEffect(
						IPC,
						1,
						message,
						Option,
						Items,
						undefined, // Source is not used
					) as any;
				},
				ShowWarningMessage: <T extends MessageItem>(
					message: string,
					...args: Array<string | T | MessageOptions>
				) => {
					const { Option, Items } = ParseArgument(args);
					return CreateShowMessageEffect(
						IPC,
						2,
						message,
						Option,
						Items,
						undefined, // Source is not used
					) as any;
				},
				ShowErrorMessage: <T extends MessageItem>(
					message: string,
					...args: Array<string | T | MessageOptions>
				) => {
					const { Option, Items } = ParseArgument(args);
					return CreateShowMessageEffect(
						IPC,
						3,
						message,
						Option,
						Items,
						undefined, // Source is not used
					) as any;
				},
			};
		}),
	},
) {}
