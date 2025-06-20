

/**
 * @module StatusBarItemImplementation
 * @description The concrete implementation of the `vscode.StatusBarItem` interface.
 */

import { Effect } from "effect";
import type {
	AccessibilityInformation,
	CancellationToken,
	Command,
	MarkdownString,
	ProviderResult,
	StatusBarAlignment,
	StatusBarItem,
	ThemeColor,
} from "vscode";

import * as ExtHostTypes from "../../Type/ExtHostTypes.js";
import CommandConverterDefinition from "../../TypeConverter/Command/Definition.js";
import StatusBarConverter from "../../TypeConverter/StatusBar.js";
import type CommandService from "../Command/Service.js";
import type IPCService from "../IPC/Service.js";

export default class StatusBarItemImplementation implements StatusBarItem {
	private IsDisposed = false;
	private IsVisible = false;

	// --- Backing fields ---
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
	tooltip2:
		| string
		| MarkdownString
		| ((
				token: CancellationToken,
		  ) => ProviderResult<string | MarkdownString | undefined>)
		| undefined;

	// ... (getters and setters are correct) ...
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
			if (
				Value instanceof ExtHostTypes.ThemeColor &&
				Value.id === "statusBarItem.errorForeground"
			) {
				this.backgroundColor = new ExtHostTypes.ThemeColor(
					"statusBarItem.errorBackground",
				);
			}
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
	show(): void {
		if (!this.IsVisible) {
			this.IsVisible = true;
			this.Update();
		}
	}
	hide(): void {
		if (this.IsVisible) {
			this.IsVisible = false;
			Effect.runFork(
				this.IPC.SendNotification("$disposeEntry", [this.EntryID]),
			);
		}
	}
	dispose(): void {
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
			() => undefined,
		);
		const DTO = StatusBarConverter.FromAPI(
			this,
			this.EntryID,
			CommandConverter,
		);
		Effect.runFork(this.IPC.SendNotification("$setEntry", [DTO]));
	}
}
