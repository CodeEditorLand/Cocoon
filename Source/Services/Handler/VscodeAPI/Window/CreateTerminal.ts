/**
 * Factory for the extension-facing `Terminal` proxy minted by
 * `vscode.window.createTerminal`. Bridges Cocoon-side
 * `terminal.sendText / show / hide / dispose / resize` mutations
 * into Mountain notifications keyed by handle, plus a lazy
 * `processId` resolver that round-trips through `Terminal.GetProcessId`
 * on first read and caches the promise.
 *
 * Stock VS Code's `Terminal.processId: Thenable<number | undefined>`
 * resolves once the PTY shell child has reported its OS pid; task
 * runners, debuggers and test harnesses await the same promise
 * shape so the cache must return the SAME promise on every read
 * (not a fresh RPC) or extensions burn quota on hot loops.
 */
import type { HandlerContext } from "../../Handler/Context.js";

export default (
	Context: HandlerContext,

	Handle: string | number,

	Options?: { name?: string; [k: string]: unknown },
): {
	name: string;

	readonly processId: Promise<number | undefined>;

	sendText: (Text: string, _AddNewLine?: boolean) => Promise<void>;

	show: (PreserveFocus?: boolean) => void;

	hide: () => void;

	dispose: () => void;

	resize: (Columns: number, Rows: number) => Promise<void>;
} => {
	const Name = Options?.name ?? `Terminal ${Handle}`;

	Context.SendToMountain("window.createTerminal", {
		handle: Handle,
		name: Name,
		options: Options ?? {},
	}).catch(() => {});

	let ProcessIdPromise: Promise<number | undefined> | undefined;

	const ResolveProcessId = (): Promise<number | undefined> => {
		if (ProcessIdPromise !== undefined) return ProcessIdPromise;

		ProcessIdPromise = (async () => {
			try {
				const Response = await Context.MountainClient?.sendRequest(
					"Terminal.GetProcessId",

					[Handle],
				);
				if (typeof Response === "number") return Response;
				if (
					Response &&
					typeof (Response as { pid?: unknown }).pid === "number"
				) {
					return (Response as { pid: number }).pid;
				}
				return undefined;
			} catch {
				return undefined;
			}
		})();

		return ProcessIdPromise;
	};

	return {
		name: Name,

		get processId() {
			return ResolveProcessId();
		},

		sendText: async (Text: string, _AddNewLine?: boolean) => {
			Context.SendToMountain("terminal.sendText", {
				handle: Handle,
				text: Text,
			}).catch(() => {});
		},

		show: (PreserveFocus?: boolean) => {
			Context.SendToMountain("terminal.show", {
				handle: Handle,
				preserveFocus: PreserveFocus,
			}).catch(() => {});
		},

		hide: () => {
			Context.SendToMountain("terminal.hide", {
				handle: Handle,
			}).catch(() => {});
		},

		dispose: () => {
			Context.SendToMountain("terminal.dispose", {
				handle: Handle,
			}).catch(() => {});
		},

		resize: async (Columns: number, Rows: number) => {
			try {
				await Context.MountainClient?.sendRequest("Terminal.Resize", [
					Handle,

					Columns,

					Rows,
				]);
			} catch {
				/* silent - best-effort UI adaptation */
			}
		},
	};
};
