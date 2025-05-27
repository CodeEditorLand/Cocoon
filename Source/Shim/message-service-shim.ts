/*---------------------------------------------------------------------------------------------
 * Cocoon Message Service Shim (message-service-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.window.showInformationMessage`, `showWarningMessage`, *
 * and `showErrorMessage` APIs. These methods provide the functionality for extensions
 * to display notifications (messages with different severity levels and optional action
 * items/buttons) to the user.
 *
 * This service proxies these calls to the Mountain host process via direct IPC, *
 * using the `_ipcRequestResponse` helper from `BaseCocoonShim`. Mountain is then
 * responsible for rendering the native notification UI and returning the user's selection.
 *
 * Responsibilities:
 * - Implementing the public `showInformationMessage`, `showWarningMessage`, and
 *   `showErrorMessage` methods as defined in the `vscode.d.ts` API.
 * - Parsing the variadic arguments of these methods to distinguish between
 *   `vscode.MessageOptions` and the actual message items (which can be strings
 *   or `vscode.MessageItem` objects).
 * - Constructing a serializable payload for the `ui_showMessage` IPC call to Mountain, *
 *   including the message, severity, relevant options (like `modal` or `detail`), *
 *   and a list of action items (where each item includes its title, a handle/index, *
 *   and an `isCloseAffordance` flag).
 * - Handling the response from Mountain, which indicates which action item (if any)
 *   the user selected. This involves mapping Mountain's response (potentially an item
 *   handle/index or an item title string) back to the original `vscode.MessageItem`
 *   or string provided by the extension.
 * - Returning `undefined` if the user dismisses the notification or if an error occurs
 *   during the IPC communication, as per the `vscode.window.show...Message` API contract.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostMessageService` is typically made available as part of
 *   the `vscode.window` API namespace through the main API factory provider in
 *   `Cocoon/index.ts`.
 * - Uses `BaseCocoonShim` for common utilities:
 *   - `_ipcRequestResponse` for direct IPC communication.
 *   - Logging methods (`_logDebug`, `_logWarn`, `_logError`).
 *   - `refineErrorForShim` for consistent error handling of IPC failures.
 * - Relies on a corresponding `ui_showMessage` IPC handler implemented in the Mountain
 *   host process to display the native notification UI.
 *
 *--------------------------------------------------------------------------------------------*/

// Import Severity enum from VS Code's platform layer if needed for mapping, though
// this shim uses its own NotificationSeverityForIpc for the direct IPC call.
// import { Severity } from "vs/platform/notification/common/notification";

import type {
	MessageItem as VscodeMessageItem,
	MessageOptions as VscodeMessageOptions,
} from "vscode";

// Public vscode API types

import {
	BaseCocoonShim,
	// Use the more specific error refiner
	refineErrorForShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	// Not used as this shim prefers direct IPC for messages
	// type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Internal enum for notification severity levels sent via IPC to Mountain.
 * These values must align with what Mountain's `ui_showMessage` IPC handler expects.
 */
enum NotificationSeverityForIpc {
	// Not typically used directly by show...Message APIs
	Ignore = 0,

	Info = 1,

	Warning = 2,

	Error = 3,
}

// If RPC were used instead of direct IPC, this would be the shape of MainThreadMessageService.
// interface MainThreadMessageServiceProxyShape {

//     $showMessage(
// VS Code's platform Severity enum
//         severity: Severity,

//         message: string,

// Or a DTO for options
//         options: VscodeMessageOptions,

// Items with handles
//         items: ({ title: string, handle: number, isCloseAffordance?: boolean })[]
// Returns handle of selected item or undefined
//     ): Promise<number | undefined>;

// }

/**
 * Defines the service interface for user notification messages, primarily part of `vscode.window`.
 * This is used for Dependency Injection if this service is registered.
 */
export interface IExtHostMessageServiceInterface {
	// Standard DI mechanism
	readonly _serviceBrand: undefined;

	showInformationMessage(
		message: string,

		...args: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;

	showWarningMessage(
		message: string,

		...args: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;

	showErrorMessage(
		message: string,

		...args: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined>;

	// TODO: Consider adding `window.withProgress` here if it's managed by a unified message/notification service,

	// or keep it separate in `window-parts-shim.ts` if it's considered distinct.
}

/**
 * Cocoon's implementation of the message notification service (`vscode.window.show...Message` APIs).
 * It proxies calls to the Mountain host process via direct IPC.
 */
export class ShimExtHostMessageService
	extends BaseCocoonShim
	implements IExtHostMessageServiceInterface
{
	public readonly _serviceBrand: undefined;

	// private _mainThreadMessageServiceProxy: MainThreadMessageServiceProxyShape | null = null;

	/**
	 * Creates an instance of ShimExtHostMessageService.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim, though this shim primarily uses direct IPC for messages).
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostMessageService", rpcService, logService);

		// Use Info for major lifecycle
		this._logInfo("Initialized.");

		// If RPC were the primary mechanism for messages:
		// if (this._rpcService) {

		//     this._mainThreadMessageServiceProxy = this._getProxy(
		//         MainContext.MainThreadMessageService as ProxyIdentifier<MainThreadMessageServiceProxyShape>
		//     );

		// }

		// if (!this._mainThreadMessageServiceProxy) {

		//     this._logWarn("MainThreadMessageService RPC proxy NOT available. Messages will rely on direct IPC (if implemented) or fail.");

		// }
	}

	/**
	 * This shim uses direct IPC (`_ipcRequestResponse`) for its core message dialog functionality
	 * and does not strictly require the main RPC proxy setup for these functions.
	 * @returns `false` as RPC is not required for core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Parses the variadic arguments (`...rest`) of the `show...Message` methods.
	 * It distinguishes between `VscodeMessageOptions` (if present as the first object argument
	 * without a 'title' property) and the subsequent action items (which can be strings or
	 * `VscodeMessageItem` objects).
	 * @param rest The array of arguments after the main message string.
	 * @returns An object containing the parsed `options` and `items`.
	 */
	private _parseMessageArgs(
		rest: (VscodeMessageOptions | string | VscodeMessageItem)[],
	): {
		options: VscodeMessageOptions;

		items: (string | VscodeMessageItem)[];
	} {
		// Default to empty options
		let options: VscodeMessageOptions = {};

		const items: (string | VscodeMessageItem)[] = [];

		if (rest.length > 0) {
			// The first element in `rest` could be `MessageOptions` or the first action item.
			// `MessageOptions` is an object but does NOT have a `title: string` property itself.
			// `MessageItem` (if an object) *must* have a `title: string` property.
			// A string item is just a string.
			if (
				typeof rest[0] === "object" &&
				rest[0] !== null &&
				// If it's an object and NOT a MessageItem (lacks title)
				!(typeof (rest[0] as VscodeMessageItem).title === "string")
			) {
				// Assume it's MessageOptions
				options = rest.shift() as VscodeMessageOptions;
			}

			// Any remaining arguments in `rest` are considered action items.
			for (const itemCandidate of rest) {
				if (typeof itemCandidate === "string") {
					items.push(itemCandidate);
				} else if (
					typeof itemCandidate === "object" &&
					itemCandidate !== null &&
					typeof itemCandidate.title === "string"
				) {
					// It's a valid MessageItem object
					items.push(itemCandidate as VscodeMessageItem);
				} else {
					this._logWarn(
						"Invalid message item encountered in showMessage arguments. It will be skipped. Item:",

						itemCandidate,
					);
				}
			}
		}

		return { options, items };
	}

	/**
	 * Internal helper to show a message with a given severity, options, and action items.
	 * This method constructs the IPC payload and handles the response from Mountain.
	 * @param severityForIpc The severity level for the IPC message.
	 * @param message The main message string.
	 * @param options Parsed `VscodeMessageOptions`.
	 * @param items Parsed array of action items (strings or `VscodeMessageItem` objects).
	 * @returns A promise resolving to the selected action item (string or `VscodeMessageItem`),
	 *
	 *
	 *
	 *          or `undefined` if the message was dismissed.
	 */
	private async _showMessage(
		severityForIpc: NotificationSeverityForIpc,

		message: string,

		options: VscodeMessageOptions,

		items: (string | VscodeMessageItem)[],
	): Promise<string | VscodeMessageItem | undefined> {
		// Assumed IPC method name on Mountain
		const ipcMethodName = "ui_showMessage";

		// Prepare action items for IPC: assign a handle (index) for robust response mapping.
		const itemsForIpc = items.map((item, index) => ({
			title: typeof item === "string" ? item : item.title,

			// Use index as a simple, unique handle for this request.
			handle: index,

			isCloseAffordance:
				typeof item === "object" ? !!item.isCloseAffordance : false,
		}));

		// Construct the IPC parameters. Only include serializable options.
		const params = {
			severity: severityForIpc,

			message,

			options: {
				// Send only relevant and serializable options to Mountain.
				// If true, dialog should be modal.
				modal: options.modal,

				// Additional detail string.
				detail: options.detail,
			},

			items: itemsForIpc,
		};

		this._logDebug(
			`Calling _showMessage (IPC method: '${ipcMethodName}'): Severity=${NotificationSeverityForIpc[severityForIpc]}, ` +
				`Message="${message.substring(0, 50)}...", Items=${itemsForIpc.length}, Options=${JSON.stringify(params.options)}`,
		);

		try {
			// Use direct IPC method `_ipcRequestResponse` inherited from BaseCocoonShim.
			// A long timeout is used as user interaction is involved. Mountain may have its own timeout.
			const resultFromMountain = (await this._ipcRequestResponse(
				ipcMethodName,

				params,

				300000 /* 5 minutes */,
			)) as number | string | undefined;

			if (
				resultFromMountain === undefined ||
				resultFromMountain === null
			) {
				this._logDebug(
					`Message dialog (IPC: ${ipcMethodName}) dismissed by user or no action taken.`,
				);

				// No selection or dialog dismissed by user.
				return undefined;
			}

			// Process the result from Mountain.
			// Contract: Mountain should ideally return the `handle` (index) of the selected item.
			// If it returns a string, assume it's the title of the selected item.
			if (typeof resultFromMountain === "number") {
				// Mountain returned a handle (index).
				const selectedItemDto = itemsForIpc.find(
					(item) => item.handle === resultFromMountain,
				);

				if (selectedItemDto) {
					// The `handle` corresponds to the index in the original `items` array.
					// Return the original item from the extension.
					return items[resultFromMountain];
				} else {
					this._logWarn(
						`Received a numeric handle (${resultFromMountain}) from '${ipcMethodName}' that does not match any sent item.`,

						"Sent items DTO:",

						itemsForIpc,
					);
				}
			} else if (typeof resultFromMountain === "string") {
				// Mountain returned the title string.
				const selectedItemByTitle = items.find(
					(origItem) =>
						(typeof origItem === "string"
							? origItem
							: origItem.title) === resultFromMountain,
				);

				if (selectedItemByTitle) {
					return selectedItemByTitle;
				}

				// If the returned string matches a simple string item, that's also valid.
				if (items.includes(resultFromMountain as string)) {
					return resultFromMountain as string;
				}

				this._logWarn(
					`Received a title string ('${resultFromMountain}') from '${ipcMethodName}' that does not match any original item title or string directly.`,
				);
			} else {
				this._logWarn(
					`Unexpected response type received from '${ipcMethodName}'. Expected number (handle) or string (title). Got:`,

					resultFromMountain,
				);
			}

			// Fallback if response processing fails.
			return undefined;
		} catch (e: any) {
			this._logError(
				`IPC call to '${ipcMethodName}' failed:`,

				refineErrorForShim(e, this._logService, ipcMethodName),
			);

			// As per `vscode.window.show...Message` API contract, return undefined on error or dismissal.
			return undefined;
		}
	}

	public showInformationMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		const { options, items } = this._parseMessageArgs(rest);

		return this._showMessage(
			NotificationSeverityForIpc.Info,

			message,

			options,

			items,
		);
	}

	public showWarningMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		const { options, items } = this._parseMessageArgs(rest);

		return this._showMessage(
			NotificationSeverityForIpc.Warning,

			message,

			options,

			items,
		);
	}

	public showErrorMessage(
		message: string,

		...rest: (VscodeMessageOptions | string | VscodeMessageItem)[]
	): Promise<string | VscodeMessageItem | undefined> {
		const { options, items } = this._parseMessageArgs(rest);

		return this._showMessage(
			NotificationSeverityForIpc.Error,

			message,

			options,

			items,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		this._logInfo("Disposed.");
	}

	// TODO: Implement `window.withProgress` if it is considered part of this message/notification service
	// according to VS Code's `IExtHostMessageService` (or `IExtHostProgress` if separate).
	// Example stub:
	// public withProgress<R>(
	//     options: vscode.ProgressOptions,

	//     task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Thenable<R>
	// ): Thenable<R> {

	//     this._logWarnOnce("API STUB: window.withProgress is not fully implemented in Cocoon. Task will run without UI progress.");

	// Minimal implementation: run the task, ignore progress reporting for now.
	//
	//     const cancellationTokenSource = new CancellationTokenSource();

	// NOP progress reporter
	//     const progressStub = { report: () => {} };

	//     try {

	//         return Promise.resolve(task(progressStub, cancellationTokenSource.token));

	//     } catch (err) {

	//         return Promise.reject(err);

	//     } finally {

	// Clean up token source
	//          cancellationTokenSource.dispose();

	//     }

	// }
}
