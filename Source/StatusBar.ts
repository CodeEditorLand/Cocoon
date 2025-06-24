/**
 * @module StatusBar
 * @description Defines the service for creating and managing items in the
 * VS Code status bar. This service provides a factory for creating individual
 * `StatusBarItem` instances and a method for showing temporary messages.
 */

import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	StatusBarAlignment,
	type AccessibilityInformation,
	type Command as VscCommand,
	type MarkdownString,
	type StatusBarItem as VscStatusBarItem,
	type ThemeColor,
} from "vscode";
import { FromAPI as CommandToDTO } from "./TypeConverter/Command/Definition.js";
import { FromAPI as StatusBarItemToDTO } from "./TypeConverter/StatusBar.js";
import { Command } from "./Command.js";
import { IPC } from "./IPC.js";

/**
 * @class StatusBarItemImplementation
 * @description An internal class that implements the `vscode.StatusBarItem` interface.
 * It holds the state for a single item and proxies all state changes to the
 * host process via IPC notifications for rendering.
 * @implements {VscStatusBarItem}
 */
class StatusBarItemImplementation implements VscStatusBarItem {
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
	private _command: string | VscCommand | undefined;
	private _accessibilityInformation: AccessibilityInformation | undefined;

	constructor(
		private readonly EntryId: string,
		private readonly ExtensionId: string,
		private readonly IPCService: IPC,
		private readonly CommandService: Command,
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
	get command(): string | VscCommand | undefined {
		return this._command;
	}
	set command(Value: string | VscCommand | undefined) {
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
				this.IPCService.SendNotification("$statusBar:dispose", [
					this.EntryId,
				]),
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
		const CommandConverter = new CommandToDTO(
			this.CommandService.registerCommand,
			(command, ...args) =>
				this.CommandService.executeCommand(command, ...args),
			() => undefined,
		);
		const DTO = StatusBarItemToDTO(
			this,
			this.EntryId,
			this.ExtensionId,
			CommandConverter,
		);
		Effect.runFork(
			this.IPCService.SendNotification("$statusBar:set", [DTO]),
		);
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
	) => Effect.Effect<VscStatusBarItem, never>;
	readonly SetStatusBarMessage: (
		Text: string,
		HideOrPromise?: number | Promise<any>,
	) => Disposable;
}

/**
 * @class StatusBar
 * @description The `Effect.Service` for the StatusBar service.
 */
export class StatusBar extends Effect.Service<StatusBar>()(
	"Service/StatusBar",
	{
		effect: Effect.gen(function* () {
			const IPCService = yield* IPC;
			const CommandService = yield* Command;
			const ActiveItemsRef = yield* Ref.make(
				new Map<string, StatusBarItemImplementation>(),
			);

			return {
				CreateStatusBarItem: (Extension, Id, Alignment, Priority) =>
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
							IPCService,
							CommandService,
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
				SetStatusBarMessage: (Text, HideOrPromise) => {
					const HideId = `status.message.${generateUuid()}`;
					const ShowEffect = IPCService.SendNotification(
						"$setStatusBarMessage",
						[HideId, Text],
					);
					const HideEffect = IPCService.SendNotification(
						"$disposeStatusBarMessage",
						[HideId],
					);
					Effect.runFork(ShowEffect);
					if (typeof HideOrPromise === "number") {
						setTimeout(
							() => Effect.runFork(HideEffect),
							HideOrPromise,
						);
					} else if (HideOrPromise) {
						HideOrPromise.then(() => Effect.runFork(HideEffect));
					}
					return new Disposable(() => Effect.runFork(HideEffect));
				},
			};
		}),
	},
) {}
