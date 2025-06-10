/**
 * @module Definition (Message)
 * @description The live implementation of the Message service.
 */

import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

import { IpcProvider } from "../Ipc/mod.js";
import type { Interface } from "./Service.js";
import { ParseArgument } from "./Support/ParseArgument.js";
import type { ExtensionSource } from "./Type.js";

const ShowMessageEffect = (
	Severity: "Info" | "Warning" | "Error",
	Message: string,
	Options: MessageOptions,
	Items: (string | MessageItem)[],
	Source: ExtensionSource | undefined,
) =>
	Effect.gen(function* (_) {
		const Ipc = yield* _(IpcProvider.Tag);

		const ItemsForIpc = Items.map((item, index) => ({
			Title: typeof item === "string" ? item : item.title,
			Handle: index,
			IsCloseAffordance:
				typeof item === "object" ? !!item.isCloseAffordance : false,
		}));

		const Result = yield* _(
			Ipc.SendRequest<number | string | undefined>("ui_showMessage", {
				Severity,
				Message,
				Options: { Modal: Options.modal, Detail: Options.detail },
				Items: ItemsForIpc,
				Source,
			}),
		);

		if (Result === undefined || Result === null) return undefined;
		if (
			typeof Result === "number" &&
			Result >= 0 &&
			Result < Items.length
		) {
			return Items[Result];
		}
		if (typeof Result === "string") {
			return (
				Items.find(
					(item) =>
						(typeof item === "string" ? item : item.title) ===
						Result,
				) ?? Result
			);
		}
		return undefined;
	});

export const Definition = Effect.succeed({
	ShowInformationMessage: (message, ...args) => {
		const { Options, Items, Source } = ParseArgument(args);
		return ShowMessageEffect("Info", message, Options, Items, Source);
	},
	ShowWarningMessage: (message, ...args) => {
		const { Options, Items, Source } = ParseArgument(args);
		return ShowMessageEffect("Warning", message, Options, Items, Source);
	},
	ShowErrorMessage: (message, ...args) => {
		const { Options, Items, Source } = ParseArgument(args);
		return ShowMessageEffect("Error", message, Options, Items, Source);
	},
} satisfies Interface);
