/*
 * File: Cocoon/Source/Service/Message/Definition.ts
 * Responsibility:
 * Modified: 2025-06-16 14:42:04 UTC
 * Dependency: ../IPC/Service.js, ./Service.js, ./Support/ParseArgument.js, ./Type.js, effect, vscode
 */

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

const ShowMessageEffect = <T extends MessageItem>(
	IPC: IPCService["Type"],
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
			[DTO.severity, DTO.message, DTO.options, DTO.items, DTO.source],
		).pipe(Effect.mapError((cause) => new Error(String(cause))));

		if (ResultHandle === undefined || ResultHandle === null) {
			return undefined;
		}
		if (ResultHandle >= 0 && ResultHandle < Items.length) {
			const resultItem = Items[ResultHandle];
			// Only return if the result is not a plain string, matching the generic constraint
			if (typeof resultItem !== "string") {
				return resultItem as T;
			}
		}
		return undefined;
	}) as Effect.Effect<T | undefined, Error>;
};

export default Effect.gen(function* () {
	const IPC = yield* IPCService;

	const ServiceImplementation: Service["Type"] = {
		ShowInformationMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				1, // Severity.Info
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
				2, // Severity.Warning
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
				3, // Severity.Error
				message,
				Option,
				Items,
				Source,
			);
		},
	};

	return ServiceImplementation;
});
