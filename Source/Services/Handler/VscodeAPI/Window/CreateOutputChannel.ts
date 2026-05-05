/**
 * Factory for the extension-facing `OutputChannel` (or `LogOutputChannel`)
 * minted by `vscode.window.createOutputChannel`. Each mutation
 * (`append` / `appendLine` / `clear` / `show` / `hide` / `replace` /
 * `dispose`) maps to a Mountain notification keyed by handle.
 *
 * The `name` field is forwarded on every `outputChannel.append` so
 * Mountain's append handler can route `Git` / `Source Control` /
 * `SCM` traffic to a visible `dev_log` tag - F6 diagnostic depends
 * on `vscode.git`'s `logger.info('[Model][doInitialScan] …')` lines
 * being readable in `Trace=short` runs.
 *
 * `LogOutputChannel` additions (`trace` / `debug` / `info` / `warn` /
 * `error`) are kept on the base channel for simplicity; they're
 * inert on non-log channels (the workbench's logger ignores the
 * level prefix when the channel isn't a LogOutputChannel) and
 * extensions that always call them shouldn't crash.
 */
import type { HandlerContext } from "../../Handler/Context.js";

export default (
	Context: HandlerContext,
	Handle: string | number,
	Name: string,
	Options?: string | { log?: boolean },
): Record<string, unknown> => {
	const IsLog =
		typeof Options === "object" && Options !== null
			? Options.log === true
			: false;
	Context.SendToMountain("outputChannel.create", {
		handle: Handle,
		name: Name,
		log: IsLog,
	}).catch(() => {});
	const Append = (Value: string): void => {
		Context.SendToMountain("outputChannel.append", {
			handle: Handle,
			name: Name,
			value: Value,
		}).catch(() => {});
	};
	const Channel: Record<string, unknown> = {
		name: Name,
		append: Append,
		appendLine: (Value: string) => Append(`${Value}\n`),
		clear: () => {
			Context.SendToMountain("outputChannel.clear", {
				handle: Handle,
			}).catch(() => {});
		},
		show: () => {
			Context.SendToMountain("outputChannel.show", {
				handle: Handle,
			}).catch(() => {});
		},
		hide: () => {
			Context.SendToMountain("outputChannel.hide", {
				handle: Handle,
			}).catch(() => {});
		},
		replace: (Value: string) => {
			Context.SendToMountain("outputChannel.clear", {
				handle: Handle,
			}).catch(() => {});
			Append(Value);
		},
		dispose: () => {
			Context.SendToMountain("outputChannel.dispose", {
				handle: Handle,
			}).catch(() => {});
		},
		logLevel: 2, // VS Code's LogLevel.Info
		onDidChangeLogLevel: (_Listener: (level: unknown) => unknown) => ({
			dispose: () => {},
		}),
		trace: (Message: string, ..._Arguments: unknown[]) =>
			Append(`[trace] ${Message}\n`),
		debug: (Message: string, ..._Arguments: unknown[]) =>
			Append(`[debug] ${Message}\n`),
		info: (Message: string, ..._Arguments: unknown[]) =>
			Append(`[info] ${Message}\n`),
		warn: (Message: string, ..._Arguments: unknown[]) =>
			Append(`[warn] ${Message}\n`),
		error: (MessageOrError: unknown, ..._Arguments: unknown[]) => {
			const Text =
				MessageOrError instanceof Error
					? (MessageOrError.stack ?? MessageOrError.message)
					: String(MessageOrError);
			Append(`[error] ${Text}\n`);
		},
	};
	return Channel;
};
