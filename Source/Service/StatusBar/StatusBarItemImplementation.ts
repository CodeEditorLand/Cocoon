/**
 * @module StatusBarItemImplementation
 * @description The concrete implementation of the `vscode.StatusBarItem` interface.
 * An instance of this class proxies its state to a corresponding UI component
 * in the Mountain host via IPC.
 */

import { Effect } from "effect";
import type {
	AccessibilityInformation,
	Color,
	Command,
	MarkdownString,
	StatusBarAlignment,
	StatusBarItem,
} from "vscode";

import { ThemeColor } from "../../Type/ExtHostTypes.js";
import * as TypeConverter from "../../TypeConverter.js";
import type { IPC } from "../IPC.js";

export class StatusBarItemImplementation implements StatusBarItem {
	private _isDisposed = false;
	private _visible = false;

	// --- Backing fields for properties ---
	private _id: string;
	private _name: string | undefined;
	private _alignment: StatusBarAlignment;
	private _priority: number | undefined;
	private _text = "";
	private _tooltip: string | MarkdownString | undefined;
	private _color: string | Color | undefined;
	private _backgroundColor: Color | undefined;
	private _command: string | Command | undefined;
	private _accessibilityInformation: AccessibilityInformation | undefined;

	constructor(
		private readonly entryID: string, // Internal unique ID for IPC
		private readonly IPCService: IPC.Interface,
		private readonly onDidDispose: () => void,
		initialID: string,
		initialAlignment: StatusBarAlignment,
		initialPriority?: number,
	) {
		this._id = initialID;
		this._alignment = initialAlignment;
		this._priority = initialPriority;
	}

	// --- Getters and Setters that trigger IPC updates ---
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
	set name(value: string | undefined) {
		if (this._name !== value) {
			this._name = value;
			this.update();
		}
	}

	get text(): string {
		return this._text;
	}
	set text(value: string) {
		if (this._text !== value) {
			this._text = value;
			this.update();
		}
	}

	get tooltip(): string | MarkdownString | undefined {
		return this._tooltip;
	}
	set tooltip(value: string | MarkdownString | undefined) {
		if (this._tooltip !== value) {
			this._tooltip = value;
			this.update();
		}
	}

	get color(): string | Color | undefined {
		return this._color;
	}
	set color(value: string | Color | undefined) {
		if (this._color !== value) {
			this._color = value;
			if (
				value instanceof ThemeColor &&
				value.id === "statusBarItem.errorForeground"
			) {
				this.backgroundColor = new ThemeColor(
					"statusBarItem.errorBackground",
				);
			}
			this.update();
		}
	}

	get backgroundColor(): Color | undefined {
		return this._backgroundColor;
	}
	set backgroundColor(value: Color | undefined) {
		if (this._backgroundColor !== value) {
			this._backgroundColor = value;
			this.update();
		}
	}

	get command(): string | Command | undefined {
		return this._command;
	}
	set command(value: string | Command | undefined) {
		if (this._command !== value) {
			this._command = value;
			this.update();
		}
	}

	get accessibilityInformation(): AccessibilityInformation | undefined {
		return this._accessibilityInformation;
	}
	set accessibilityInformation(value: AccessibilityInformation | undefined) {
		if (this._accessibilityInformation !== value) {
			this._accessibilityInformation = value;
			this.update();
		}
	}

	// --- Public Methods ---
	show(): void {
		if (!this._visible) {
			this._visible = true;
			this.update();
		}
	}

	hide(): void {
		if (this._visible) {
			this._visible = false;
			// Send a dispose notification to the host to remove the UI item.
			Effect.runFork(
				this.IPCService.SendNotification("$disposeEntry", [
					this.entryID,
				]),
			);
		}
	}

	dispose(): void {
		if (!this._isDisposed) {
			this._isDisposed = true;
			this.hide();
			this.onDidDispose();
		}
	}

	// --- Private Methods ---
	private update(): void {
		if (this._isDisposed || !this._visible) {
			return;
		}
		// The update is a fire-and-forget notification to the host.
		// A real CommandConverter would be injected.
		const commandConverter = new TypeConverter.Command.Definition(
			{} as any,
			() => undefined,
		);
		const DTO = TypeConverter.StatusBar.FromAPI(
			this,
			this.entryID,
			commandConverter,
		);
		Effect.runFork(this.IPCService.SendNotification("$setEntry", [DTO]));
	}
}
