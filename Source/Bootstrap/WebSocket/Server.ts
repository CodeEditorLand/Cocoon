/**
 * @module Bootstrap/WebSocket/Server
 * JSON-RPC WebSocket server for Sky<->Cocoon direct transport (B7-S6).
 * Auth: secret via URL ?secret=, Sec-WebSocket-Protocol, or X-Land-Secret.
 */
import { timingSafeEqual } from "node:crypto";

import { createServer } from "node:http";

import { URL } from "node:url";

import { CocoonDevLog } from "../../Services/Dev/Log.js";

import RouteRequest from "../../Services/Handler/Request/Routing/Handler.js";

const _Port = parseInt(process.env["COCOON_WS_PORT"] ?? "0", 10);

const _SecretHex = (process.env["COCOON_WS_SECRET"] ?? "").toLowerCase();

function _Match(c: string): boolean {
	if (!_SecretHex || !c) return false;

	try {
		const A = Buffer.from(_SecretHex, "hex";

		const B = Buffer.from(c.toLowerCase(), "hex";

		if (A.length !== B.length) return false;

		return timingSafeEqual(A, B;
	} catch {
		return false;
	}
}

async function _Handle(ws: any, raw: string): Promise<void> {
	let id: any = null;

	try {
		const m = JSON.parse(raw) as {
			id?: any;

			method?: string;

			params?: unknown;
		};

		id = m.id ?? null;

		const method = m.method ?? "";

		if (!method) return;

		if (id === null) {
			RouteRequest(method, m.params ?? {}).catch(() => {};

			return;
		}

		const result = await RouteRequest(method, m.params ?? {};

		ws.send(JSON.stringify({ id, result: result ?? null });
	} catch (e) {
		if (id !== null)
			ws.send(
				JSON.stringify({
					id,
					error: e instanceof Error ? e.message : String(e),
				}),
			;
	}
}

export async function StartWebSocketServer(): Promise<void> {
	if (!_Port || !_SecretHex) {
		CocoonDevLog(
			"ws",

			"[WS] COCOON_WS_PORT/SECRET unset - WS server skipped",
		;

		return;
	}

	const { WebSocketServer } = await import("ws";

	const http = createServer(;

	const wss = new WebSocketServer({ noServer: true };

	http.on("upgrade", (req, sock, head) => {
		let cand = "";

		try {
			cand =
				new URL(req.url ?? "", "http://localhost").searchParams.get(
					"secret",
				) ?? "";
		} catch {}

		if (!cand) {
			const p = req.headers["sec-websocket-protocol"] ?? "";

			cand = Array.isArray(p) ? (p[0] ?? "") : p;
		}

		if (!cand) {
			const x = req.headers["x-land-secret"] ?? "";

			cand = Array.isArray(x) ? (x[0] ?? "") : x;
		}

		if (!_Match(cand)) {
			sock.write(
				"HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n",
			;

			sock.destroy(;

			return;
		}

		wss.handleUpgrade(req, sock, head, (c) =>
			wss.emit("connection", c, req),
		;
	};

	wss.on("connection", (ws: any) => {
		CocoonDevLog("ws", "[WS] client connected";

		ws.on("message", (raw: any) => void _Handle(ws, raw.toString());

		ws.on("close", () => CocoonDevLog("ws", "[WS] disconnected");

		ws.on("error", (e: Error) =>
			CocoonDevLog("ws", "[WS] error: " + e.message),
		;
	};

	await new Promise<void>((res, rej) => {
		http.listen(_Port, "127.0.0.1", () => {
			process.stdout.write(
				"[LandFix:WS] WebSocket server on 127.0.0.1:" + _Port + "\n",
			;

			res(;
		};

		http.once("error", rej;
	};
}

export default StartWebSocketServer;
