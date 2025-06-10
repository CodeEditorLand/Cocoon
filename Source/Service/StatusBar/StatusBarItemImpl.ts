/**
 * @module StatusBarItemImpl
 * @description The concrete implementation of the `vscode.StatusBarItem` interface.
 */

import { Effect } from "effect";
import type {
	AccessibilityInformation,
	Color,
	Command,
	Event,
	MarkdownString,
	StatusBarAlignment,
	StatusBarItem,
} from "vscode";

import * as TypeConverter from "../../TypeConverter/mod.js";
import type { Ipc } from "../Ipc/mod.js";

export class StatusBarItemImpl implements StatusBarItem {
	private _isDisposed = false;
	private _visible = false;
	private _id: string;

	// --- Backing fields for properties ---
	private _alignment: StatusBarAlignment;
	private _priority: number | undefined;
	private _text = "";
	private _tooltip: string | MarkdownString | undefined;
	private _color: string | Color | undefined;
	private _command: string | Command | undefined;
	private _accessibilityInformation: AccessibilityInformation | undefined;
	// ... other properties

	constructor(
		private readonly EntryId: string, // Internal unique ID
		private readonly IpcService: Ipc.Interface,
		private readonly OnDidDispose: () => void,
		InitialId: string,
		InitialAlignment: StatusBarAlignment,
		InitialPriority?: number,
	) {
		this._id = InitialId;
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
	// ... other getters/setters

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
			// Send a dispose notification to the host to hide the item.
			Effect.runFork(
				this.IpcService.SendNotification("$disposeEntry", [
					this.EntryId,
				]),
			);
		}
	}

	dispose(): void {
		if (!this._disposed) {
			this.hide();
			this._disposed = true;
			this.OnDidDispose();
		}
	}

	// --- Private Methods ---
	private update(): void {
		if (this._disposed || !this._visible) {
			return;
		}
		// The update is a fire-and-forget notification to the host.
		const Dto = TypeConverter.StatusBar.fromApi(this, this.EntryId);
		Effect.runFork(this.IpcService.SendNotification("$setEntry", [Dto]));
	}
}
