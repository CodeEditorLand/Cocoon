/**
 * @module Cocoon/Debug/Server
 * @description
 * Cocoon-layer DebugServer - the Node/extension-host half of the dual-layer
 * inspection HTTP surface. Provides the same wire protocol as the Mountain
 * Rust DebugServer (`Element/Mountain/Source/Binary/Debug/WebkitServer.rs`)
 * so an external tool can speak one protocol and hit either layer.
 *
 * # Activation
 *
 * Reads the same unified env var as Mountain:
 *
 * | DebugServer value             | Cocoon listener starts? |
 * |-------------------------------|-------------------------|
 * | unset, `0`, `false`, `off`    | no                      |
 * | `1`, `true`, `on`             | no (legacy = mountain)  |
 * | `mountain`, `m`               | no                      |
 * | `cocoon`, `c`, `eh`           | yes                     |
 * | `both`, `all`, `dual`         | yes                     |
 *
 * Port: `DebugServerPortCocoon` (default `9934`).
 *
 * # Endpoints
 *
 * | Method | Path             | Purpose                                            |
 * |--------|------------------|----------------------------------------------------|
 * | GET    | `/health`        | Layer identity + capability advertisement          |
 * | GET    | `/layers`        | Discoverability                                    |
 * | POST   | `/execute`       | `{js,target?}` - eval in EH (`global` scope)       |
 * | GET    | `/extensions`    | List activated extension IDs (best-effort)         |
 * | GET    | `/commands`      | List EH-registered commands                        |
 * | POST   | `/command`       | `{id,args?}` - invoke an EH command                |
 * | GET    | `/processes`     | PID/uptime/memory of the EH process                |
 *
 * All requests are loopback-only (`127.0.0.1`) and respond with JSON.
 *
 * # Safety
 *
 * - Bound to `127.0.0.1` only.
 * - Never started unless the env explicitly opts the Cocoon layer in.
 * - Compiled out by esbuild when `NODE_ENV === "production"` via the
 *   guard at the top of `Start()`.
 */

import * as Http from "node:http";

type LayerMode = "off" | "mountain" | "cocoon" | "both";

function ParseMode(): LayerMode {

	const Raw = (process.env.DebugServer ?? "").trim().toLowerCase();

	if (
		Raw === "" ||
		Raw === "0" ||
		Raw === "false" ||
		Raw === "off" ||
		Raw === "no"
	)

		return "off";

	if (Raw === "mountain" || Raw === "m" || Raw === "native" || Raw === "rust")

		return "mountain";

	if (
		Raw === "cocoon" ||
		Raw === "c" ||
		Raw === "eh" ||
		Raw === "extension-host" ||
		Raw === "node"
	)

		return "cocoon";

	if (Raw === "both" || Raw === "all" || Raw === "dual") return "both";

	if (Raw === "1" || Raw === "true" || Raw === "on" || Raw === "yes")

		return "mountain"; // legacy: 1 = mountain-only

	return "off";
}

function CocoonEnabled(M: LayerMode): boolean {

	return M === "cocoon" || M === "both";
}

function MountainPort(): number {

	const V =
		process.env.DebugServerPortMountain ?? process.env.DebugServerPort;

	const N = V ? Number.parseInt(V, 10) : Number.NaN;

	return Number.isFinite(N) ? N : 9933;
}

function CocoonPort(): number {

	const V = process.env.DebugServerPortCocoon;

	const N = V ? Number.parseInt(V, 10) : Number.NaN;

	return Number.isFinite(N) ? N : 9934;
}

let ServerInstance: Http.Server | null = null;

/**
 * Hook supplied by the Cocoon command-router so `/command` and `/commands`
 * can introspect the extension-host command registry without import cycles.
 * Set this from the bootstrap path *after* the command service is ready.
 */
export interface CommandHooks {

	/** Returns an array of registered command IDs. */
	ListCommands?(): string[];

	/** Executes a registered command and returns the result. */
	ExecuteCommand?(Id: string, Args: readonly unknown[]): Promise<unknown>;

	/** Returns activated extension identifiers, if known. */
	ListExtensions?(): string[];
}

let Hooks: CommandHooks = {};

/** Late-binding registration. Call after the command service is constructed. */
export function RegisterHooks(Next: CommandHooks): void {

	Hooks = { ...Hooks, ...Next };
}

/**
 * Starts the Cocoon DebugServer if the env explicitly enables the Cocoon
 * layer. Safe to call unconditionally - it no-ops otherwise. Returns the
 * resolved port (or `null` if the server did not start).
 */
export function Start(): number | null {

	if (ServerInstance) return CocoonPort();

	const Mode = ParseMode();

	if (!CocoonEnabled(Mode)) return null;

	const Port = CocoonPort();

	const Server = Http.createServer((Req, Res) => {
		HandleRequest(Req, Res).catch((Err) => {
			try {
				Res.statusCode = 500;

				Res.setHeader("content-type", "application/json");

				Res.end(JSON.stringify({ error: String(Err?.stack ?? Err) }));
			} catch {
				/* ignore */
			}
		});
	});

	Server.on("error", (Err: NodeJS.ErrnoException) => {
		// EADDRINUSE → previous instance left lingering; surface a clear log.
		process.stderr.write(
			`[CocoonDebug] listener error on ${Port}: ${Err.code ?? Err.message}\n`,
		);
	});

	Server.listen(Port, "127.0.0.1", () => {
		process.stderr.write(
			`[CocoonDebug] Cocoon layer listening on http://127.0.0.1:${Port} (mode=${Mode})\n`,
		);
	});

	ServerInstance = Server;

	return Port;
}

/** Stops the listener. Used by tests and graceful shutdown. */
export function Stop(): void {

	if (!ServerInstance) return;

	try {
		ServerInstance.close();
	} catch {
		/* ignore */
	}

	ServerInstance = null;
}

// ============================================================================
// Request handler
// ============================================================================

async function ReadJsonBody(Req: Http.IncomingMessage): Promise<unknown> {

	const Chunks: Buffer[] = [];

	for await (const C of Req) Chunks.push(C as Buffer);

	if (Chunks.length === 0) return {};

	try {
		return JSON.parse(Buffer.concat(Chunks).toString("utf8"));
	} catch {
		return {};
	}
}

function SendJson(
	Res: Http.ServerResponse,

	Status: number,

	Body: unknown,
): void {

	const Text = JSON.stringify(Body);

	Res.statusCode = Status;

	Res.setHeader("content-type", "application/json");

	Res.setHeader("content-length", Buffer.byteLength(Text).toString());

	Res.end(Text);
}

async function HandleRequest(
	Req: Http.IncomingMessage,

	Res: Http.ServerResponse,
): Promise<void> {

	const Url = new URL(Req.url ?? "/", "http://127.0.0.1");

	const Path = Url.pathname;

	const Method = (Req.method ?? "GET").toUpperCase();

	// ---------- discovery -------------------------------------------------
	if (Method === "GET" && Path === "/health") {
		return SendJson(Res, 200, {
			layer: "cocoon",
			pid: process.pid,
			node: process.version,
			uptimeSeconds: Math.round(process.uptime()),
			mode: ParseMode(),
			capabilities: [
				"health",
				"layers",
				"execute",
				"extensions",
				"commands",
				"command",
				"processes",
			],
		});
	}

	if (Method === "GET" && Path === "/layers") {
		return SendJson(Res, 200, {
			mountain: {
				enabled: ParseMode() !== "cocoon" && ParseMode() !== "off",
				port: MountainPort(),
			},
			cocoon: { enabled: CocoonEnabled(ParseMode()), port: CocoonPort() },
			mode: ParseMode(),
		});
	}

	// ---------- EH eval ---------------------------------------------------
	if (Method === "POST" && Path === "/execute") {
		const Body = (await ReadJsonBody(Req)) as {
			js?: string;

			target?: string;
		};

		const Js = String(Body.js ?? "");

		if (!Js) return SendJson(Res, 400, { error: "missing js" });

		const Target = Body.target ?? "extension-host";

		if (
			Target !== "extension-host" &&
			Target !== "eh" &&
			Target !== "cocoon"
		)

			return SendJson(Res, 400, {
				error: `unsupported target: ${Target}`,
			});

		try {
			// Indirect eval so the script runs in the global scope.
			const Result = await (0, eval)(Js);

			return SendJson(Res, 200, {
				ok: true,
				result: SafeSerialize(Result),
			});
		} catch (Err) {
			return SendJson(Res, 500, {
				ok: false,
				error: String((Err as Error)?.stack ?? Err),
			});
		}
	}

	// ---------- introspection --------------------------------------------
	if (Method === "GET" && Path === "/extensions") {
		try {
			const Ids = Hooks.ListExtensions?.() ?? [];

			return SendJson(Res, 200, {
				extensions: Ids,
				source: Hooks.ListExtensions ? "hook" : "unavailable",
			});
		} catch (Err) {
			return SendJson(Res, 500, {
				error: String((Err as Error)?.message ?? Err),
			});
		}
	}

	if (Method === "GET" && Path === "/commands") {
		try {
			const Ids = Hooks.ListCommands?.() ?? [];

			return SendJson(Res, 200, {
				commands: Ids,
				source: Hooks.ListCommands ? "hook" : "unavailable",
			});
		} catch (Err) {
			return SendJson(Res, 500, {
				error: String((Err as Error)?.message ?? Err),
			});
		}
	}

	if (Method === "POST" && Path === "/command") {
		const Body = (await ReadJsonBody(Req)) as {
			id?: string;

			args?: unknown[];
		};

		const Id = String(Body.id ?? "");

		const Args = Array.isArray(Body.args) ? Body.args : [];

		if (!Id) return SendJson(Res, 400, { error: "missing id" });

		if (!Hooks.ExecuteCommand)

			return SendJson(Res, 503, {
				error: "ExecuteCommand hook not registered",
			});

		try {
			const Result = await Hooks.ExecuteCommand(Id, Args);

			return SendJson(Res, 200, {
				ok: true,
				result: SafeSerialize(Result),
			});
		} catch (Err) {
			return SendJson(Res, 500, {
				ok: false,
				error: String((Err as Error)?.stack ?? Err),
			});
		}
	}

	if (Method === "GET" && Path === "/processes") {
		const Mem = process.memoryUsage();

		return SendJson(Res, 200, {
			pid: process.pid,
			ppid: process.ppid,
			uptimeSeconds: Math.round(process.uptime()),
			rssMb: Math.round(Mem.rss / 1024 / 1024),
			heapUsedMb: Math.round(Mem.heapUsed / 1024 / 1024),
			heapTotalMb: Math.round(Mem.heapTotal / 1024 / 1024),
			arch: process.arch,
			platform: process.platform,
		});
	}

	SendJson(Res, 404, { error: "not found", method: Method, path: Path });
}

/**
 * Best-effort JSON serialization. Falls back to String() for values that
 * cannot survive `JSON.stringify` (cycles, BigInt, functions, undefined).
 */
function SafeSerialize(V: unknown): unknown {

	if (V === undefined) return null;

	try {
		JSON.stringify(V);

		return V;
	} catch {
		return String(V);
	}
}
