/**
 * @module Handler/VscodeAPI/Window/RegisterCustomEditor
 * @description
 * Shared registration body for `registerCustomEditorProvider` and
 * `registerCustomReadonlyEditorProvider`. Subscribes to the
 * `customEditor.*` channels emitted by `NotificationHandler.ts` and
 * dispatches the corresponding provider method when the workbench
 * issues a reverse-RPC. The subscription lives on `Context.Emitter`
 * scoped per-handle so dispose() cleans it up without affecting
 * other registrations of the same `viewType`.
 *
 * Provider method shapes (per `vscode.d.ts`):
 *
 *   resolveCustomEditor(document, webviewPanel, token) - mandatory.
 *   resolveCustomTextEditor(document, webviewPanel, token) - text variant.
 *   saveCustomDocument(document, cancellation) - returns Thenable<void>.
 *   saveCustomDocumentAs(document, destination, cancellation).
 *   revertCustomDocument(document, cancellation).
 *   backupCustomDocument(document, context, cancellation).
 *   willSaveCustomDocument(document, cancellation).
 *   didChangeCustomDocument(document) - fires after each in-process edit.
 *
 * Each method receives the document object the workbench sends in the
 * reverse-RPC payload; we forward verbatim. The handler returns the
 * provider's promise so the workbench-side awaiter resolves with the
 * extension's result. Errors are caught and reported via `process.stdout`
 * so a buggy provider never crashes the host - readonly providers
 * silently skip the save participants.
 */

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import {
	CustomEditorProviders,
	CustomEditorProvidersByViewType,
} from "./Registry.js";

const RegisterCustomEditor = (
	Context: HandlerContext,

	ViewType: string,

	Provider: any,

	Options: {
		supportsMultipleEditorsPerDocument?: boolean;

		webviewOptions?: unknown;
	},

	IsReadonly: boolean,
) => {
	const Handle = NextProviderHandle(;

	CustomEditorProviders.set(String(Handle), Provider;

	CustomEditorProvidersByViewType.set(ViewType, {
		Provider,
		Readonly: IsReadonly,
		Handle,
	};

	// Scan the extension registry for the selector (glob patterns like
	// "*.{png,jpg}") matching this viewType. Sky uses the selector to
	// register with IEditorResolverService so VS Code routes file opens to
	// the custom editor instead of the text editor.
	let Selector: unknown[] = [];

	for (const [, Ext] of Context.ExtensionRegistry) {
		const Contributions = Ext?.contributes?.customEditors;

		if (Array.isArray(Contributions)) {
			const Match = Contributions.find(
				(CE: any) => CE?.viewType === ViewType,
			;

			if (Match?.selector) {
				Selector = Array.isArray(Match.selector)
					? Match.selector
					: [Match.selector];

				break;
			}
		}
	}

	Context.MountainClient?.sendRequest("webview.registerCustomEditor", {
		handle: Handle,
		viewType: ViewType,
		selector: Selector,
		options: {
			readonly: IsReadonly,
			supportsMultipleEditorsPerDocument:
				Options.supportsMultipleEditorsPerDocument ?? false,
			webviewOptions: Options.webviewOptions ?? {},
		},
	}).catch(() => {};

	const SafeAwait = async (
		Channel: string,

		MethodName: string,

		Payload: any,
	): Promise<unknown> => {
		const Entry = CustomEditorProvidersByViewType.get(
			Payload?.viewType ?? ViewType,
		;

		if (!Entry || Entry.Handle !== Handle) return undefined;

		if (Entry.Readonly && MethodName !== "resolveCustomEditor")
			return undefined;

		const Method = (Entry.Provider as Record<string, unknown>)?.[
			MethodName
		];

		if (typeof Method !== "function") return undefined;

		try {
			const Result = await (Method as (...A: unknown[]) => unknown).call(
				Entry.Provider,

				Payload?.document,

				Payload?.context ?? Payload?.destination,

				Payload?.token,
			;

			return Result;
		} catch (Error) {
			try {
				process.stdout.write(
					`[CustomEditor:${Channel}] provider for "${ViewType}" threw: ${
						Error instanceof globalThis.Error
							? Error.message
							: String(Error)
					}\n`,
				;
			} catch {}

			return undefined;
		}
	};

	const Listeners: Array<{
		Channel: string;

		Listener: (P: unknown) => void;
	}> = [];

	const Subscribe = (Channel: string, MethodName: string) => {
		const Listener = (Payload: unknown) => {
			void SafeAwait(Channel, MethodName, Payload;
		};

		Context.Emitter.on(Channel, Listener;

		Listeners.push({ Channel, Listener };
	};

	Subscribe("customEditor.saveDocument", "saveCustomDocument";

	Subscribe("customEditor.saveDocumentAs", "saveCustomDocumentAs";

	Subscribe("customEditor.revertCustomDocument", "revertCustomDocument";

	Subscribe("customEditor.backupCustomDocument", "backupCustomDocument";

	Subscribe("customEditor.willSaveCustomDocument", "willSaveCustomDocument";

	Subscribe(
		"customEditor.didChangeCustomDocument",

		"didChangeCustomDocument",
	;

	return {
		dispose: () => {
			for (const { Channel, Listener } of Listeners) {
				Context.Emitter.off(
					Channel,

					Listener as (..._A: unknown[]) => void,
				;
			}

			Listeners.length = 0;

			CustomEditorProviders.delete(String(Handle);

			const ByViewType = CustomEditorProvidersByViewType.get(ViewType;

			if (ByViewType && ByViewType.Handle === Handle) {
				CustomEditorProvidersByViewType.delete(ViewType;
			}

			Context.MountainClient?.sendRequest(
				"webview.unregisterCustomEditor",

				{ handle: Handle, viewType: ViewType },
			).catch(() => {};
		},
	};
};

export default RegisterCustomEditor;
