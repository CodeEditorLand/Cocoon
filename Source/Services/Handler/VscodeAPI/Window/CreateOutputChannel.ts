/**
 * Factory for the extension-facing `OutputChannel` (or `LogOutputChannel`)
 * minted by `vscode.window.createOutputChannel`. Each mutation
 * (`append` / `appendLine` / `clear` / `show` / `hide` / `replace` /
 * `dispose`) maps to a Mountain notification keyed by handle.
 *
 * For `LogOutputChannel` (created with `{ log: true }`), the surface
 * mirrors `vscode.LogOutputChannel`:
 *   - `logLevel` reflects the current channel level (Trace=1, Debug=2,
 *     Info=3, Warning=4, Error=5, Off=6 per upstream `LogLevel`)
 *   - level-prefixed methods (`trace` / `debug` / `info` / `warn` /
 *     `error`) format with ISO-8601 timestamps and the level tag
 *   - level filtering: writes below the current `logLevel` drop silently
 *   - `onDidChangeLogLevel` fires when the workbench rotates the level
 *
 * Plain (non-log) channels keep the level methods as harmless aliases
 * for `appendLine` so extensions that always call them work regardless.
 */
import type { HandlerContext } from "../../Handler/Context.js";

const enum LogLevel {
	Off = 0,

	Trace = 1,

	Debug = 2,

	Info = 3,

	Warning = 4,

	Error = 5,
}

const FormatTimestamp = (): string => {
	// `2024-01-15 10:23:45.123` - matches upstream `AbstractLogger`'s
	// timestamp output so users see the same format they get from the
	// built-in log channels.
	const Now = new Date();

	const Pad = (N: number, Width: number = 2) =>
		String(N).padStart(Width, "0");

	return (
		Now.getFullYear() +
		"-" +
		Pad(Now.getMonth() + 1) +
		"-" +
		Pad(Now.getDate()) +
		" " +
		Pad(Now.getHours()) +
		":" +
		Pad(Now.getMinutes()) +
		":" +
		Pad(Now.getSeconds()) +
		"." +
		Pad(Now.getMilliseconds(), 3)
	);
};

const FormatLog = (Level: string, Message: string): string =>
	`${FormatTimestamp()} [${Level}] ${Message}\n`;

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

	let CurrentLevel: LogLevel = LogLevel.Info;

	const LevelListeners: Array<(Level: LogLevel) => void> = [];

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

	const ShouldLog = (Level: LogLevel): boolean =>
		IsLog && CurrentLevel !== LogLevel.Off && Level >= CurrentLevel;

	// Listen for level changes pushed from Mountain (when the user
	// changes the channel's log level via the "Set Log Level..."
	// command). The notification handler in Cocoon emits this on
	// `outputChannel.logLevel:<handle>`.
	const LevelChannel = `outputChannel.logLevel:${Handle}`;

	const LevelListener = (NextLevel: unknown) => {
		const Resolved =
			typeof NextLevel === "number"
				? (NextLevel as LogLevel)
				: typeof NextLevel === "string"
					? ((LogLevel as any)[NextLevel] ?? CurrentLevel)
					: CurrentLevel;

		if (Resolved === CurrentLevel) return;

		CurrentLevel = Resolved;

		for (const L of LevelListeners.slice()) {
			try {
				L(Resolved);
			} catch {
				/* swallow */
			}
		}
	};

	Context.Emitter?.on?.(LevelChannel, LevelListener);

	const Channel: Record<string, unknown> = {
		name: Name,

		append: Append,

		appendLine: (Value: string) => Append(`${Value}\n`),

		clear: () => {
			Context.SendToMountain("outputChannel.clear", {
				handle: Handle,
			}).catch(() => {});
		},

		// `show(preserveFocus?)` is the modern signature; the historic
		// `show(column, preserveFocus?)` overload still exists for
		// pre-1.16 extensions. Forward both forms so the panel reveals.
		show: (ColumnOrPreserveFocus?: unknown, PreserveFocus?: unknown) => {
			const Preserve =
				typeof ColumnOrPreserveFocus === "boolean"
					? ColumnOrPreserveFocus
					: !!PreserveFocus;

			Context.SendToMountain("outputChannel.show", {
				handle: Handle,
				preserveFocus: Preserve,
			}).catch(() => {});
		},

		hide: () => {
			Context.SendToMountain("outputChannel.hide", {
				handle: Handle,
			}).catch(() => {});
		},

		// Stock VS Code's `replace(value)` does NOT prepend a newline;
		// it replaces the entire channel buffer atomically. Use a
		// dedicated Mountain method so the workbench can batch the
		// clear+write as one render rather than a flash of empty.
		replace: (Value: string) => {
			Context.SendToMountain("outputChannel.replace", {
				handle: Handle,
				value: Value,
			}).catch(() => {});
		},

		dispose: () => {
			try {
				Context.Emitter?.off?.(LevelChannel, LevelListener);
			} catch {
				/* swallow */
			}

			Context.SendToMountain("outputChannel.dispose", {
				handle: Handle,
			}).catch(() => {});
		},

		get logLevel() {
			return CurrentLevel;
		},

		onDidChangeLogLevel: (Listener: (Level: LogLevel) => unknown) => {
			LevelListeners.push(Listener);

			return {
				dispose: () => {
					const Index = LevelListeners.indexOf(Listener);

					if (Index >= 0) LevelListeners.splice(Index, 1);
				},
			};
		},

		// For LogOutputChannel: format with timestamp + level tag + filter.
		// For plain channels: drop everything through appendLine as a
		// best-effort alias so older extensions that always call these
		// don't break.
		trace: (Message: string, ..._Arguments: unknown[]) => {
			if (IsLog) {
				if (ShouldLog(LogLevel.Trace))
					Append(FormatLog("trace", Message));
			} else {
				Append(`${Message}\n`);
			}
		},

		debug: (Message: string, ..._Arguments: unknown[]) => {
			if (IsLog) {
				if (ShouldLog(LogLevel.Debug))
					Append(FormatLog("debug", Message));
			} else {
				Append(`${Message}\n`);
			}
		},

		info: (Message: string, ..._Arguments: unknown[]) => {
			if (IsLog) {
				if (ShouldLog(LogLevel.Info))
					Append(FormatLog("info", Message));
			} else {
				Append(`${Message}\n`);
			}
		},

		warn: (Message: string, ..._Arguments: unknown[]) => {
			if (IsLog) {
				if (ShouldLog(LogLevel.Warning))
					Append(FormatLog("warning", Message));
			} else {
				Append(`${Message}\n`);
			}
		},

		error: (MessageOrError: unknown, ..._Arguments: unknown[]) => {
			const Text =
				MessageOrError instanceof Error
					? (MessageOrError.stack ?? MessageOrError.message)
					: String(MessageOrError);

			if (IsLog) {
				if (ShouldLog(LogLevel.Error)) Append(FormatLog("error", Text));
			} else {
				Append(`${Text}\n`);
			}
		},
	};

	return Channel;
};
