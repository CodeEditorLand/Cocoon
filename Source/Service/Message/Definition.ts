/**
 * @module Definition (Message)
 * @description The live implementation of the Message service.
 */

import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import { ParseArgument } from "./Support/ParseArgument.js";
import type { ExtensionSource } from "./Type.js";

function ShowMessageEffect(
	Severity: "Info" | "Warning" | "Error",
	Message: string,
	Option: MessageOptions,
	Items: (string | MessageItem)[],
	Source: ExtensionSource | undefined,
) {
	return Effect.gen(function* (_) {
		const IPCService = yield* _(IPC.Tag);

		const ItemsForIPC = Items.map((item, index) => ({
			title: typeof item === "string" ? item : item.title,
			isCloseAffordance:
				typeof item === "object" ? !!item.isCloseAffordance : false,
			handle: index, // The host uses this handle to report the chosen item
		}));

		const DTO = {
			severity: Severity,
			message: Message,
			options: { modal: Option.modal, detail: Option.detail },
			items: ItemsForIPC,
			source: Source
				? { identifier: Source.id, name: Source.displayName }
				: undefined,
		};

		const ResultHandle = yield* _(
			IPCService.SendRequest<number | undefined>("$showMessage", [
				Severity,
				Message,
				DTO.options,
				DTO.items,
				DTO.source,
			]),
		);

		if (ResultHandle === undefined || ResultHandle === null) {
			return undefined;
		}
		if (ResultHandle >= 0 && ResultHandle < Items.length) {
			return Items[ResultHandle];
		}
		return undefined;
	});
}

export const Definition = Effect.succeed({
	ShowInformationMessage: (message, ...args) => {
		const { Option, Items, Source } = ParseArgument(args);
		return ShowMessageEffect("Info", message, Option, Items, Source);
	},
	ShowWarningMessage: (message, ...args) => {
		const { Option, Items, Source } = ParseArgument(args);
		return ShowMessageEffect("Warning", message, Option, Items, Source);
	},
	ShowErrorMessage: (message, ...args) => {
		const { Option, Items, Source } = ParseArgument(args);
		return ShowMessageEffect("Error", message, Option, Items, Source);
	},
} satisfies Interface);
