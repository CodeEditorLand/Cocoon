/**
 * @module Definition (Message)
 * @description The live implementation of the Message service.
 */

import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import ParseArgument from "./Support/ParseArgument.js";
import type ExtensionSource from "./Type.js";

const ShowMessageEffect = (
	IPC: IPCService,
	Severity: "Info" | "Warning" | "Error",
	Message: string,
	Option: MessageOptions,
	Items: (string | MessageItem)[],
	Source: ExtensionSource | undefined,
) => {
	return Effect.gen(function* () {
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
			[Severity, Message, DTO.options, DTO.items, DTO.source],
		);

		if (ResultHandle === undefined || ResultHandle === null) {
			return undefined;
		}
		if (ResultHandle >= 0 && ResultHandle < Items.length) {
			return Items[ResultHandle];
		}
		return undefined;
	});
};

export default Effect.gen(function* () {
	const IPC = yield* IPCService;

	const ServiceImplementation: Service["Type"] = {
		ShowInformationMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				"Info",
				message,
				Option,
				Items,
				Source,
			);
		},
		ShowWarningMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				"Warning",
				message,
				Option,
				Items,
				Source,
			);
		},
		ShowErrorMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				"Error",
				message,
				Option,
				Items,
				Source,
			);
		},
	};

	return ServiceImplementation;
});
