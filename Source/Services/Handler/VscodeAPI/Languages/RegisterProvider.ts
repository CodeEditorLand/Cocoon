/**
 * @module Handler/VscodeAPI/Languages/RegisterProvider
 *
 * Shared helper for all `vscode.languages.register*Provider` calls.
 * Auto-assigns a numeric handle via `LanguageProviderRegistry.RegisterAutoHandle`,
 * notifies Mountain via `Context.SendToMountain`, and returns a VS Code
 * `Disposable` that unregisters the provider on dispose.
 */

import type { HandlerContext } from "../../Handler/Context.js";

/**
 * Register `Provider` under `MethodName` and return a disposable.
 * Null/undefined providers return a no-op disposable so extensions that
 * defensively pass `null` when a feature flag is off don't crash.
 */
export const RegisterProvider = (
	Context: HandlerContext,

	LanguageProviderRegistry: typeof import("../../../Language/Provider/Registry.js"),

	MethodName: string,

	Selector: any,

	Provider: any,
): { dispose: () => void } => {

	if (Provider == null || typeof Provider !== "object") {
		return { dispose: () => {} };
	}

	let Handle: number;

	try {
		Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider;
	} catch {
		// RegisterAutoHandle should be infallible but soft-fail to a noop
		// disposable on any future registry-full / duplicate-registration error.
		return { dispose: () => {} };
	}

	const Language =
		typeof Selector === "string"
			? Selector
			: typeof Selector?.language === "string"
				? Selector.language
				: "*";

	Context.SendToMountain(MethodName, {
		handle: Handle,
		languageSelector: Language,
		extensionId: "",
	}).catch(() => {};

	return {
		dispose: () => {
			try {
				LanguageProviderRegistry.Unregister(Handle;
			} catch {
				/* registry already cleared on shutdown */
			}
		},
	};
};
