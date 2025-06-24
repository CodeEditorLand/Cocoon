/*
 * File: Cocoon/Source/Service/StatusBar/Service.ts
 * Role: Defines the StatusBar service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Declare the contract for creating status bar items and showing temporary messages.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	Disposable,
	StatusBarAlignment,
	type AccessibilityInformation,
	type Command,
	type MarkdownString,
	type StatusBarItem,
	type ThemeColor,
} from "vscode";

import CommandConverterDefinition from "../../TypeConverter/Command/Definition.js";
import StatusBarConverter from "../../TypeConverter/StatusBar.js";
import { Command as CommandService } from "../Command/Service.js";
import { IPC as IPCService } from "../IPC/Service.js";

// --- Internal StatusBarItem Implementation ---
class StatusBarItemImplementation implements StatusBarItem {
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
	private _command: string | Command | undefined;
	private _accessibilityInformation: AccessibilityInformation | undefined;

	constructor(
		private readonly EntryID: string,
		private readonly ExtensionID: string,
		private readonly IPC: IPCService,
		private readonly CommandService: CommandService,
		private readonly OnDidDispose: () => void,
		InitialID: string,
		InitialAlignment: StatusBarAlignment,
		InitialPriority?: number,
	) {
		this._id = InitialID;
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
	get command(): string | Command | undefined {
		return this._command;
	}
	set command(Value: string | Command | undefined) {
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
				this.IPC.SendNotification("$statusBar:dispose", [this.EntryID]),
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
		const CommandConverter = new CommandConverterDefinition(
			this.CommandService.RegisterCommand,
			(command, ...args) =>
				this.CommandService.ExecuteCommand(command, ...args),
			() => undefined,
		);
		const DTO = StatusBarConverter.FromAPI(
			this,
			this.EntryID,
			this.ExtensionID,
			CommandConverter,
		);
		Effect.runFork(this.IPC.SendNotification("$statusBar:set", [DTO]));
	}
}

// --- Service Definition ---
export class StatusBar extends Effect.Service<StatusBar>()(
	"Service/StatusBar",
	{
		effect: Effect.gen(function* (Generator) {
			const IPC = yield* Generator(IPCService);
			const Command = yield* Generator(CommandService);
			const ActiveItemsRef = yield* Generator(
				Ref.make(new Map<string, StatusBarItemImplementation>()),
			);

			return {
				CreateStatusBarItem: (Extension, ID, Alignment, Priority) =>
					Effect.sync(() => {
						const EntryID = generateUuid();
						const ItemID =
							ID ?? `${Extension.identifier.value}.${EntryID}`;
						const FinalAlignment =
							Alignment ?? StatusBarAlignment.Left;
						const OnDispose = () =>
							Effect.runSync(
								Ref.update(
									ActiveItemsRef,
									(Map) => (Map.delete(EntryID), Map),
								),
							);
						const Entry = new StatusBarItemImplementation(
							EntryID,
							Extension.identifier.value,
							IPC,
							Command,
							OnDispose,
							ItemID,
							FinalAlignment,
							Priority,
						);
						Effect.runSync(
							Ref.update(ActiveItemsRef, (Map) =>
								Map.set(EntryID, Entry),
							),
						);
						return Entry;
					}),
				SetStatusBarMessage: (Text, HideOrPromise) => {
					const HideId = `status.message.${generateUuid()}`;
					const ShowEffect = IPC.SendNotification(
						"$setStatusBarMessage",
						[HideId, Text],
					);
					const HideEffect = IPC.SendNotification(
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
