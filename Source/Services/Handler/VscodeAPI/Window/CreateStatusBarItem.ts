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
	const Item = {
		id: Handle,

		alignment: typeof AlignmentOrId === "number" ? AlignmentOrId : 1,

		priority: Priority,

		text: "",

		tooltip: "",

		command: undefined as string | undefined,

		show: () => {
			Context.SendToMountain("statusBar.update", {
				handle: Handle,
				text: Item.text,
				tooltip: Item.tooltip,
				command: Item.command,
				visible: true,
			}).catch(() => {});
		},

		hide: () => {
			Context.SendToMountain("statusBar.update", {
				handle: Handle,
				visible: false,
			}).catch(() => {});
		},

		dispose: () => {
			Context.SendToMountain("statusBar.dispose", {
				handle: Handle,
			}).catch(() => {});
		},
	};

	return Item as Record<string, unknown>;
};
