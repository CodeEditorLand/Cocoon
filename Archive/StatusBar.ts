/**
 * @module StatusBar
 * @description Defines the service for creating and managing items in the
 * VS Code status bar.
 */

import { generateUuid } from "@codeeditorland/output/vs/base/common/uuid.js";
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect, Ref } from "effect";
import {
	Disposable,
	StatusBarAlignment,
	type AccessibilityInformation,
	type CancellationToken,
	type MarkdownString,
	type ProviderResult,
	type ThemeColor,
	type Command as VSCodeCommand,
	type StatusBarItem as VSCodeStatusBarItem,
} from "vscode";

import { CommandService, type Command as CommandInterface } from "./Command.js";
import { IPCService, type IPC } from "./IPC.js";
import { Command as CommandConverter } from "./TypeConverter/Command.js";
import { FromAPI as StatusBarItemToDTO } from "./TypeConverter/StatusBar.js";

/**
 * @class StatusBarItemImplementation
 * @description An internal class that implements the `vscode.StatusBarItem` interface.
 * @implements {VSCodeStatusBarItem}
 */
export class StatusBarItemImplementation implements VSCodeStatusBarItem {
	private IsDisposed = false;

	private IsVisible = false;

	private _id: string;

	private _name: string | undefined;

	private _alignment: StatusBarAlignment;

	private _priority: number | undefined;

	private _text = "";

	private _tooltip: string | MarkdownString | undefined;

	private _color: string | ThemeColor | undefined;

	private _backgroundColor: ThemeColor | undefined;

	private _command: string | VSCodeCommand | undefined;

	private _accessibilityInformation: AccessibilityInformation | undefined;

	public tooltip2:
		| string
		| MarkdownString
		| ((
				token: CancellationToken,
		  ) => ProviderResult<string | MarkdownString | undefined>)
		| undefined;

	constructor(
		private readonly EntryId: string,

		private readonly ExtensionId: string,

		private readonly IPC: IPC,

		private readonly Command: CommandInterface,

		private readonly OnDidDispose: () => void,

		InitialId: string,

		InitialAlignment: StatusBarAlignment,

		InitialPriority?: number,
	) {
		this._id = InitialId;

		this._alignment = InitialAlignment;

		this._priority = InitialPriority;
	}

	get id(): string {
		return this._id;
	}

	get alignment(): StatusBarAlignment {
		return this._alignment;
	}

	get priority(): number | undefined {
		return this._priority;
	}

	get name(): string | undefined {
		return this._name;
	}

	set name(Value: string | undefined) {
		if (this._name !== Value) {
			this._name = Value;

			this.Update();
		}
	}

	get text(): string {
		return this._text;
	}

	set text(Value: string) {
		if (this._text !== Value) {
			this._text = Value;

			this.Update();
		}
	}

	get tooltip(): string | MarkdownString | undefined {
		return this._tooltip;
	}

	set tooltip(Value: string | MarkdownString | undefined) {
		if (this._tooltip !== Value) {
			this._tooltip = Value;

			this.Update();
		}
	}

	get color(): string | ThemeColor | undefined {
		return this._color;
	}

	set color(Value: string | ThemeColor | undefined) {
		if (this._color !== Value) {
			this._color = Value;

			this.Update();
		}
	}

	get backgroundColor(): ThemeColor | undefined {
		return this._backgroundColor;
	}

	set backgroundColor(Value: ThemeColor | undefined) {
		if (this._backgroundColor !== Value) {
			this._backgroundColor = Value;

			this.Update();
		}
	}

	get command(): string | VSCodeCommand | undefined {
		return this._command;
	}

	set command(Value: string | VSCodeCommand | undefined) {
		if (this._command !== Value) {
			this._command = Value;

			this.Update();
		}
	}

	get accessibilityInformation(): AccessibilityInformation | undefined {
		return this._accessibilityInformation;
	}

	set accessibilityInformation(Value: AccessibilityInformation | undefined) {
		if (this._accessibilityInformation !== Value) {
			this._accessibilityInformation = Value;

			this.Update();
		}
	}

	public show(): void {
		if (!this.IsVisible) {
			this.IsVisible = true;

			this.Update();
		}
	}

	public hide(): void {
		if (this.IsVisible) {
			this.IsVisible = false;

			Effect.runFork(
				this.IPC.SendNotification("$statusBar:dispose", [this.EntryId]),
			);
		}
	}

	public dispose(): void {
		if (!this.IsDisposed) {
			this.IsDisposed = true;

			this.hide();

			this.OnDidDispose();
		}
	}

	private Update(): void {
		if (this.IsDisposed || !this.IsVisible) return;

		const TheCommandConverter = new CommandConverter(
			// FIX: Pass a function with the correct signature for the converter.
			// The converter uses this to register *internal* commands, not global ones.
			(_global, id, handler, thisArg) =>
				this.Command.registerCommand(false, id, handler, thisArg),

			this.Command.executeCommand as any,

			() => undefined,
		);

		const DTO = StatusBarItemToDTO(
			this,

			this.EntryId,

			this.ExtensionId,

			TheCommandConverter,
		);

		Effect.runFork(this.IPC.SendNotification("$statusBar:set", [DTO]));
	}
}

/**
 * @interface StatusBar
 * @description The contract for the StatusBar service.
 */
export interface StatusBar {
	readonly CreateStatusBarItem: (
		Extension: IExtensionDescription,

		Id?: string,

		Alignment?: StatusBarAlignment,

		Priority?: number,
	) => Effect.Effect<VSCodeStatusBarItem, never>;

	readonly SetStatusBarMessage: (
		Text: string,

		HideOrPromise?: number | Promise<any>,
	) => Disposable;
}

/**
 * @class StatusBarService
 * @description The `Effect.Service` for the StatusBar service.
 */
export class StatusBarService extends Effect.Service<StatusBarService>()(
	"Service/StatusBar",

	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Command = yield* CommandService;
			const ActiveItemsRef = yield* Ref.make(
				new Map<string, StatusBarItemImplementation>(),
			);

			return {
				CreateStatusBarItem: (
					Extension: IExtensionDescription,

					Id?: string,

					Alignment?: StatusBarAlignment,

					Priority?: number,
				) =>
					Effect.sync(() => {
						const EntryId = generateUuid();
						const ItemId =
							Id ?? `${Extension.identifier.value}.${EntryId}`;
						const FinalAlignment =
							Alignment ?? StatusBarAlignment.Left;
						const OnDispose = () =>
							Effect.runSync(
								Ref.update(
									ActiveItemsRef,

									(Map) => (Map.delete(EntryId), Map),
								),
							);
						const Entry = new StatusBarItemImplementation(
							EntryId,

							Extension.identifier.value,

							IPC,

							Command,

							OnDispose,

							ItemId,

							FinalAlignment,

							Priority,
						);
						Effect.runSync(
							Ref.update(ActiveItemsRef, (Map) =>
								Map.set(EntryId, Entry),
							),
						);
						return Entry;
					}),
				SetStatusBarMessage: (
					text: string,

					hideOrPromise?: number | Promise<any>,
				) => {
					const HideId = `status.message.${generateUuid()}`;
					const ShowEffect = IPC.SendNotification(
						"$setStatusBarMessage",

						[HideId, text],
					);
					const HideEffect = IPC.SendNotification(
						"$disposeStatusBarMessage",

						[HideId],
					);
					Effect.runFork(ShowEffect);
					if (typeof hideOrPromise === "number") {
						setTimeout(
							() => Effect.runFork(HideEffect),

							hideOrPromise,
						);
					} else if (hideOrPromise) {
						hideOrPromise.then(() => Effect.runFork(HideEffect));
					}
					return new Disposable(() => Effect.runFork(HideEffect));
				},
			};
		}),
	},
) {}
