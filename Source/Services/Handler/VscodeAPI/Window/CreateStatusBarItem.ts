/**
 * Factory for the extension-facing `StatusBarItem` proxy minted by
 * `vscode.window.createStatusBarItem`. Bridges Cocoon-side
 * `item.show / hide / dispose` mutations into Mountain
 * `statusBar.update` / `statusBar.dispose` notifications keyed by
 * handle. The item itself stores `text` / `tooltip` / `command` /
 * `alignment` as plain mutable properties; show() pushes the
 * current snapshot.
 *
 * Supports both overloads documented by upstream:
 *   createStatusBarItem(alignment?, priority?)
 *   createStatusBarItem(id, alignment?, priority?)
 *
 * The `id` overload (1.74+) is used by Git, GitLens, ESLint, language
 * indicators and Copilot - without proper id handling, these items
 * stack as anonymous siblings and the user sees duplicate entries
 * after every reload because the workbench can't reconcile.
 */
import type { HandlerContext } from "../../Handler/Context.js";

const enum StatusBarAlignment {

	Left = 1,

	Right = 2,
}

const ResolveOverload = (
	FirstArg: unknown,

	SecondArg: unknown,

	ThirdArg: unknown,
): {

	Id: string | undefined;

	Alignment: number;

	Priority: number | undefined;
} => {

	// Three-arg form: createStatusBarItem(id, alignment, priority)
	if (typeof FirstArg === "string") {
		return {
			Id: FirstArg,

			Alignment:
				typeof SecondArg === "number"
					? SecondArg
					: StatusBarAlignment.Left,

			Priority: typeof ThirdArg === "number" ? ThirdArg : undefined,
		};
	}

	// Two-arg form: createStatusBarItem(alignment, priority)
	return {
		Id: undefined,

		Alignment:
			typeof FirstArg === "number" ? FirstArg : StatusBarAlignment.Left,

		Priority: typeof SecondArg === "number" ? SecondArg : undefined,
	};
};

export default (
	Context: HandlerContext,

	Handle: string | number,

	AlignmentOrId?: unknown,

	PriorityOrAlignment?: unknown,

	Priority?: number,
): Record<string, unknown> => {

	const {
		Id,

		Alignment,

		Priority: ResolvedPriority,
	} = ResolveOverload(AlignmentOrId, PriorityOrAlignment, Priority);

	let CurrentText = "";

	let CurrentTooltip: unknown = "";

	let CurrentCommand: unknown = undefined;

	let CurrentBackgroundColor: unknown = undefined;

	let CurrentColor: unknown = undefined;

	let CurrentVisible = false;

	let CurrentName: string | undefined = undefined;

	let CurrentAccessibility: unknown = undefined;

	let Disposed = false;

	const Push = () => {
		if (Disposed) return;

		if (!CurrentVisible) return;

		// Normalise `command` into the wire shape. VS Code accepts both a
		// plain string command id and a `vscode.Command` object with
		// `{ title, command, arguments, tooltip }`. We forward both so the
		// workbench's status-bar renderer can handle them uniformly.
		const NormalisedCommand =
			typeof CurrentCommand === "string"
				? CurrentCommand
				: typeof CurrentCommand === "object" && CurrentCommand !== null
					? {
							command: (CurrentCommand as any).command,

							arguments: (CurrentCommand as any).arguments,

							title: (CurrentCommand as any).title,

							tooltip: (CurrentCommand as any).tooltip,
						}

					: undefined;

		Context.SendToMountain("statusBar.update", {
			handle: Handle,
			id: Id,
			alignment: Alignment,
			priority: ResolvedPriority,
			text: CurrentText,
			tooltip: CurrentTooltip,
			command: NormalisedCommand,
			backgroundColor: CurrentBackgroundColor,
			color: CurrentColor,
			visible: true,
			name: CurrentName,
			accessibilityInformation: CurrentAccessibility,
		}).catch(() => {});
	};

	const Item: Record<string, unknown> = {
		// `item.id` is read by extensions to disambiguate which item
		// fired their command. Upstream returns the `id` from the
		// `createStatusBarItem(id, ...)` overload, falling back to a
		// stable generated string. Use the explicit id when present;
		// otherwise the handle is the stable fallback.
		id: Id ?? String(Handle),

		alignment: Alignment,

		priority: ResolvedPriority,

		get text() {
			return CurrentText;
		},

		set text(Value: unknown) {
			if (Disposed) return;

			const Next = String(Value ?? "");

			if (Next === CurrentText) return;

			CurrentText = Next;

			Push();
		},

		get tooltip() {
			return CurrentTooltip;
		},

		set tooltip(Value: unknown) {
			if (Disposed) return;

			CurrentTooltip = Value;

			Push();
		},

		get command() {
			return CurrentCommand;
		},

		set command(Value: unknown) {
			if (Disposed) return;

			CurrentCommand = Value;

			Push();
		},

		get backgroundColor() {
			return CurrentBackgroundColor;
		},

		set backgroundColor(Value: unknown) {
			if (Disposed) return;

			CurrentBackgroundColor = Value;

			Push();
		},

		get color() {
			return CurrentColor;
		},

		set color(Value: unknown) {
			if (Disposed) return;

			CurrentColor = Value;

			Push();
		},

		get name() {
			return CurrentName;
		},

		set name(Value: string | undefined) {
			if (Disposed) return;

			CurrentName = typeof Value === "string" ? Value : undefined;

			Push();
		},

		get accessibilityInformation() {
			return CurrentAccessibility;
		},

		set accessibilityInformation(Value: unknown) {
			if (Disposed) return;

			CurrentAccessibility = Value;

			Push();
		},

		show: () => {
			if (Disposed) return;

			if (CurrentVisible) return;

			CurrentVisible = true;

			Push();
		},

		hide: () => {
			if (Disposed) return;

			if (!CurrentVisible) return;

			CurrentVisible = false;

			Context.SendToMountain("statusBar.update", {
				handle: Handle,
				id: Id,
				visible: false,
			}).catch(() => {});
		},

		// `dispose()` is idempotent in stock VS Code - calling it twice
		// is a no-op on the second pass. Previously a double-dispose
		// fired the Mountain notification twice and removed an item
		// that didn't exist on the second emit (logged as "warn").
		dispose: () => {
			if (Disposed) return;

			Disposed = true;

			CurrentVisible = false;

			Context.SendToMountain("statusBar.dispose", {
				handle: Handle,
				id: Id,
			}).catch(() => {});
		},
	};

	return Item;
};
