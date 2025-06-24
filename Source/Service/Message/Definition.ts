/*
 * File: Cocoon/Source/Service/Message/Definition.ts
 *
 * This file contains the live implementation of the Message service.
 */

import { Effect } from "effect";
import type { MessageItem, MessageOptions } from "vscode";

import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import ParseArgument from "./Support/ParseArgument.js";
import type ExtensionSource from "./Type.js";

const ShowMessageEffect = <T extends MessageItem>(
	IPC: IPCService,
	// Corresponds to vs/base/common/severity
	Severity: number,
	Message: string,
	Option: MessageOptions,
	Items: (string | T)[],
	Source: ExtensionSource | undefined,
): Effect.Effect<T | undefined, Error> => {
	return Effect.gen(function* (G) {
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

		const ResultHandle = yield* G(
			IPC.SendRequest<number | undefined>("$showMessage", [
				DTO.severity,
				DTO.message,
				DTO.options,
				DTO.items,
				DTO.source,
			]).pipe(Effect.mapError((cause) => new Error(String(cause)))),
		);

		if (ResultHandle === undefined || ResultHandle === null) {
			return undefined;
		}

		if (ResultHandle >= 0 && ResultHandle < Items.length) {
			const resultItem = Items[ResultHandle];
			if (typeof resultItem !== "string") {
				return resultItem as T;
			}
		}

		return undefined;
	});
};

/**
 * An Effect that builds the live implementation of the Message service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	const ServiceImplementation: Service = {
		ShowInformationMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				// Severity.Info
				1,
				message,
				Option,
				Items,
				Source,
			) as any;
		},
		ShowWarningMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				// Severity.Warning
				2,
				message,
				Option,
				Items,
				Source,
			) as any;
		},
		ShowErrorMessage: (message, ...args) => {
			const { Option, Items, Source } = ParseArgument(args);
			return ShowMessageEffect(
				IPC,
				// Severity.Error
				3,
				message,
				Option,
				Items,
				Source,
			) as any;
		},
	};

	return ServiceImplementation;
});
