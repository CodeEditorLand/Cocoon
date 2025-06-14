/**
 * @module AsExtensionEvent
 * @description Defines a higher-order function that wraps a raw event emitter
 * to provide safe error handling for extension listeners.
 */

import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type LogService from "../../Service/Log/Service.js";

/**
 * Creates a safe `vscode.Event` by wrapping an existing event emitter.
 *
 * This function takes a raw `Event` and returns a new `Event` function. When an
 * extension subscribes to the new event, its listener is wrapped in a
 * `try...catch` block. This prevents a faulty or poorly-written listener in
 * one extension from throwing an unhandled exception and crashing the entire
 * extension host. Any errors caught are logged using the provided `LogService`.
 *
 * @param ExtensionID The identifier of the extension that will be listening.
 * @param Log An instance of the logging service to report errors.
 * @param ActualEvent The original `vscode.Event<T>` to wrap.
 * @returns A new, safe `vscode.Event<T>` that can be exposed to extensions.
 */
const AsExtensionEvent = <T>(
	ExtensionID: ExtensionIdentifier,
	Log: LogService,
	ActualEvent: VSCode.Event<T>,
): VSCode.Event<T> => {
	// Return a new event subscription function.
	return (Listener, ThisArgument, Disposables) => {
		// Create a "safe" listener that wraps the original extension-provided listener.
		const SafeListener = (Event: T) => {
			try {
				Listener.call(ThisArgument, Event);
			} catch (Error) {
				Log.Error(
					`[${ExtensionID.value}] FAILED to handle event:`,
					Error,
				);
				// This is also where telemetry reporting for extension errors would be triggered.
			}
		};

		// Subscribe the safe listener to the actual event.
		const Handle = ActualEvent(SafeListener);
		Disposables?.push(Handle);
		return Handle;
	};
};

export default AsExtensionEvent;
