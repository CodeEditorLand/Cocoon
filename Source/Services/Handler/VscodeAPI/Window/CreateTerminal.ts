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

	// Track terminal state. VS Code 1.81+: `Terminal.state` is
	// `{ isInteractedWith, shell }`. GitLens, Continue, and Copilot
	// branch on `terminal.state.isInteractedWith` to decide whether
	// they can re-use an existing terminal or must spawn a new one.
	// Mountain emits `window.terminal.stateChanged` notifications that
	// the notification handler routes through Context.Emitter; here we
	// listen and update the cached snapshot.
	let CurrentState = {
		isInteractedWith: false,

		shell: undefined as string | undefined,
	};

	try {
		Context.Emitter?.on?.(
			`window.terminal.stateChanged:${Handle}`,

			(Update: { isInteractedWith?: boolean; shell?: string }) => {
				if (typeof Update?.isInteractedWith === "boolean") {
					CurrentState = {
						...CurrentState,
						isInteractedWith: Update.isInteractedWith,
					};
				}

				if (typeof Update?.shell === "string") {
					CurrentState = { ...CurrentState, shell: Update.shell };
				}
			},
		);
	} catch {
		/* swallow - emitter may not be ready yet */
	}

	return {
		name: Name,

		get processId() {
			return ResolveProcessId();
		},

		get state() {
			return CurrentState;
		},

		// `exitStatus` reflects the shell's exit code once the PTY has
		// terminated. Stays `undefined` while the terminal is alive.
		// Mountain emits `window.terminal.exitStatus:<handle>` when the
		// child reports its exit.
		get exitStatus(): { code: number | undefined } | undefined {
			return (Context as any)?.[`__terminalExitStatus:${Handle}`];
		},

		sendText: async (Text: string, AddNewLine?: boolean) => {
			// Per `vscode.d.ts`: `addNewLine` defaults to `true`. Test
			// runners (Mocha, Jest), npm scripts, build runners and the
			// terminal-suggest feature all rely on this default to
			// auto-execute the typed command. Previously we silently
			// dropped the boolean and Mountain received text without a
			// trailing CR, so the user saw the command typed but never
			// run until they pressed Enter manually. Mirror upstream by
			// appending `\r` when AddNewLine is `true` or absent.
			const ShouldAppendNewLine = AddNewLine !== false;

			const Payload = ShouldAppendNewLine ? `${Text}\r` : Text;

			Context.SendToMountain("terminal.sendText", {
				handle: Handle,
				text: Payload,
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
