/**
 * @module Utility/LandFixLog
 * @description
 * Production-survivable structured logger for Cocoon's `[LandFix:…]`
 * diagnostic breadcrumbs. Uses `process.stdout.write` / `process.stderr.write`
 * directly so esbuild's `drop: ["console"]` (active in every non-dev build)
 * cannot strip the call sites away. Lines are ISO-timestamped and tag-prefixed
 * so a pasted terminal log stays grep-friendly and machine-parseable.
 *
 * Controlled by two environment variables, both read once at module load:
 *
 * | `LAND_LANDFIX_LOG` | Behaviour                                           |
 * | ------------------ | --------------------------------------------------- |
 * | `off`              | All LandFix output is silenced                      |
 * | `short` (default)  | `HH:MM:SS.mmm` timestamp + tag + message            |
 * | `long`             | Full ISO-8601 timestamp + tag + message + Debug on  |
 *
 * | `LAND_LANDFIX_TAGS` | Comma-separated allowlist (e.g. `Bootstrap,WsNs`)  |
 * | ------------------- | -------------------------------------------------- |
 * | unset (default)     | All tags emit                                      |
 * | `Tag1,Tag2`         | Only those tags emit; all others silenced          |
 *
 * Errors always go to `process.stderr` so they interleave with Node's own
 * error stream; other levels go to `process.stdout`. Context objects are
 * serialised as JSON at the tail of the line, with circular references
 * collapsed to `"[Circular]"` for safety.
 *
 * The logger is intentionally synchronous and dependency-free — it must work
 * before Effect-TS, before Mountain's gRPC connection, and inside catch
 * handlers that fire during shutdown.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const Mode = process.env["LAND_LANDFIX_LOG"] ?? "short";
const Enabled = Mode !== "off";
const Long = Mode === "long";
const DebugEnabled = Long;

const AllowList: ReadonlySet<string> | undefined = (() => {
	const Raw = process.env["LAND_LANDFIX_TAGS"];
	if (!Raw || Raw.trim().length === 0) return undefined;
	const Tags = Raw.split(",")
		.map((Entry) => Entry.trim())
		.filter((Entry) => Entry.length > 0);
	return Tags.length === 0 ? undefined : new Set(Tags);
})();

const PadTwo = (Value: number): string =>
	Value < 10 ? `0${Value}` : String(Value);

const PadThree = (Value: number): string =>
	Value < 10 ? `00${Value}` : Value < 100 ? `0${Value}` : String(Value);

const FormatTimestamp = (): string => {
	const Now = new Date();
	if (Long) return Now.toISOString();
	return `${PadTwo(Now.getHours())}:${PadTwo(Now.getMinutes())}:${PadTwo(
		Now.getSeconds(),
	)}.${PadThree(Now.getMilliseconds())}`;
};

const SerializeContext = (
	Context: Readonly<Record<string, unknown>>,
): string => {
	const Seen = new WeakSet<object>();
	try {
		return JSON.stringify(Context, (_Key, Value: unknown) => {
			if (Value instanceof Error) {
				return { name: Value.name, message: Value.message };
			}
			if (typeof Value === "bigint") return String(Value);
			if (typeof Value === "function") return "[Function]";
			if (typeof Value === "object" && Value !== null) {
				if (Seen.has(Value)) return "[Circular]";
				Seen.add(Value);
			}
			return Value;
		});
	} catch {
		return '"[Unserializable]"';
	}
};

const LevelTag = (Level: LogLevel): string =>
	Level === "info" ? "" : ` ${Level.toUpperCase()}`;

const FormatLine = (
	Level: LogLevel,
	Tag: string,
	Message: string,
	Context: Readonly<Record<string, unknown>> | undefined,
): string => {
	const Head = `${FormatTimestamp()} [LandFix:${Tag}]${LevelTag(Level)} ${Message}`;
	if (!Context) return `${Head}\n`;
	return `${Head} ${SerializeContext(Context)}\n`;
};

const Emit = (
	Stream: NodeJS.WriteStream,
	Level: LogLevel,
	Tag: string,
	Message: string,
	Context: Readonly<Record<string, unknown>> | undefined,
): void => {
	if (!Enabled) return;
	if (AllowList && !AllowList.has(Tag)) return;
	try {
		Stream.write(FormatLine(Level, Tag, Message, Context));
	} catch {
		// Defensive: a closed stdout (broken pipe on shutdown) must not crash
		// the extension host mid-log. Swallow the write error silently.
	}
};

const Info = (
	Tag: string,
	Message: string,
	Context?: Readonly<Record<string, unknown>>,
): void => {
	Emit(process.stdout, "info", Tag, Message, Context);
};

const Warn = (
	Tag: string,
	Message: string,
	Context?: Readonly<Record<string, unknown>>,
): void => {
	Emit(process.stdout, "warn", Tag, Message, Context);
};

const ErrorLog = (
	Tag: string,
	Message: string,
	Context?: Readonly<Record<string, unknown>>,
): void => {
	Emit(process.stderr, "error", Tag, Message, Context);
};

const Debug = (
	Tag: string,
	Message: string,
	Context?: Readonly<Record<string, unknown>>,
): void => {
	if (!DebugEnabled) return;
	Emit(process.stdout, "debug", Tag, Message, Context);
};

const LandFixLog = {
	Info,
	Warn,
	Error: ErrorLog,
	Debug,
	IsEnabled: (): boolean => Enabled,
	IsDebugEnabled: (): boolean => DebugEnabled,
	Mode: (): "off" | "short" | "long" =>
		Mode === "off" ? "off" : Long ? "long" : "short",
} as const;

export default LandFixLog;
