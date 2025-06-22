/*
 * File: Cocoon/Source/Service/StatusBar/StatusBarItemImplementation.ts
 *
 * This file contains the concrete implementation of the `vscode.StatusBarItem` interface.
 * It holds the state for a single status bar item and proxies all state changes
 * to the Mountain host process via IPC notifications.
 */

import { Effect } from "effect";
import type {
	AccessibilityInformation,
	Command,
	MarkdownString,
	StatusBarAlignment,
	StatusBarItem,
	ThemeColor,
} from "vscode";

import CommandConverterDefinition from "../../TypeConverter/Command/Definition.js";
import StatusBarConverter from "../../TypeConverter/StatusBar.js";
import type CommandService from "../Command/Service.js";
import type IPCService from "../IPC/Service.js";

/**
 * A class that implements the `vscode.StatusBarItem` interface, providing a
 * proxy for managing a status bar item whose state is ultimately stored and
 * rendered in the Mountain host process.
 */
export default class StatusBarItemImplementation implements StatusBarItem {
	private IsDisposed = false;
	private IsVisible = false;

	// --- Backing fields for properties ---
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
		// Internal, unique UUID for this instance.
		private readonly EntryID: string,
		private readonly ExtensionID: string,
		private readonly IPC: IPCService["Type"],
		private readonly CommandService: CommandService["Type"],
		private readonly OnDidDispose: () => void,
		InitialID: string,
		InitialAlignment: StatusBarAlignment,
		InitialPriority?: number,
	) {
		this._id = InitialID;
		this._alignment = InitialAlignment;
		this._priority = InitialPriority;
	}

	// --- Getters and Setters ---
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

	// --- Public Methods ---
	public show(): void {
		if (!this.IsVisible) {
			this.IsVisible = true;
			this.Update();
		}
	}
	public hide(): void {
		if (this.IsVisible) {
			this.IsVisible = false;
			const DisposeEffect = this.IPC.SendNotification(
				"$statusBar:dispose",
				[this.EntryID],
			);
			Effect.runFork(DisposeEffect);
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
		if (this.IsDisposed || !this.IsVisible) {
			return;
		}
		const CommandConverter = new CommandConverterDefinition(
			this.CommandService.RegisterCommand,
			(command, ...args) =>
				this.CommandService.ExecuteCommand(command, ...args),
			// getCommands is not needed for serialization.
			() => undefined,
		);
		const DTO = StatusBarConverter.FromAPI(
			this,
			this.EntryID,
			this.ExtensionID,
			CommandConverter,
		);
		const UpdateEffect = this.IPC.SendNotification("$statusBar:set", [DTO]);
		Effect.runFork(UpdateEffect);
	}
}
