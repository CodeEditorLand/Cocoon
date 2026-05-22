/**
 * Factory for the extension-facing `StatusBarItem` proxy minted by
 * `vscode.window.createStatusBarItem`. Bridges Cocoon-side
 * `item.show / hide / dispose` mutations into Mountain
 * `statusBar.update` / `statusBar.dispose` notifications keyed by
 * handle. The item itself stores `text` / `tooltip` / `command` /
 * `alignment` as plain mutable properties; show() pushes the
 * current snapshot.
 */
import type { HandlerContext } from "../../Handler/Context.js";

export default (
	Context: HandlerContext,

	Handle: string | number,

	AlignmentOrId?: unknown,

	Priority?: number,
): Record<string, unknown> => {
	let _text = "";
	let _tooltip: unknown = "";
	let _command: unknown = undefined;
	let _backgroundColor: unknown = undefined;
	let _color: unknown = undefined;
	let _visible = false;
	let _name: unknown = undefined;

	const Push = () => {
		if (!_visible) return;
		Context.SendToMountain("statusBar.update", {
			handle: Handle,
			text: _text,
			tooltip: _tooltip,
			command:
				typeof _command === "string"
					? _command
					: (_command as any)?.command,
			backgroundColor: _backgroundColor,
			color: _color,
			visible: true,
			name: _name,
		}).catch(() => {});
	};

	const Item: Record<string, unknown> = {
		id: Handle,
		alignment:
			typeof AlignmentOrId === "number"
				? AlignmentOrId
				: typeof AlignmentOrId === "object"
					? 1
					: 1,
		priority: Priority,
		name: _name,

		get text() {
			return _text;
		},
		set text(V: unknown) {
			_text = String(V ?? "");
			Push();
		},

		get tooltip() {
			return _tooltip;
		},
		set tooltip(V: unknown) {
			_tooltip = V;
			Push();
		},

		get command() {
			return _command;
		},
		set command(V: unknown) {
			_command = V;
			Push();
		},

		get backgroundColor() {
			return _backgroundColor;
		},
		set backgroundColor(V: unknown) {
			_backgroundColor = V;
			Push();
		},

		get color() {
			return _color;
		},
		set color(V: unknown) {
			_color = V;
			Push();
		},

		get accessibilityInformation() {
			return undefined;
		},
		set accessibilityInformation(_V: unknown) {},

		show: () => {
			_visible = true;
			Push();
		},

		hide: () => {
			_visible = false;
			Context.SendToMountain("statusBar.update", {
				handle: Handle,
				visible: false,
			}).catch(() => {});
		},

		dispose: () => {
			_visible = false;
			Context.SendToMountain("statusBar.dispose", {
				handle: Handle,
			}).catch(() => {});
		},
	};

	return Item;
};
