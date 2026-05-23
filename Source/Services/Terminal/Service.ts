/**
 * @module TerminalService
 * @description
 * Implements the Terminal API over the Universal Spine.
 * Manages PTY processes via Mountain.
 */

import { Context, Effect, Layer } from "effect";

import { IMountainClientService } from "../../Interfaces/I/Mountain/Client/Service.js";
import { CocoonDevLog } from "../Dev/Log.js";

// --- Interfaces ---

export interface ITerminalService {
	createTerminal(
		name: string,

		shellPath?: string,

		cwd?: string,
	): Promise<number>;

	sendText(terminalId: number, text: string): Promise<void>;

	resize(terminalId: number, cols: number, rows: number): Promise<void>;

	kill(terminalId: number): Promise<void>;
}

export const ITerminalService = Context.Tag("ITerminalService")<
	ITerminalService,
	ITerminalService
>();

// --- Implementation ---

export class TerminalService implements ITerminalService {
	constructor(private mountainClient: IMountainClientService) {}

	async createTerminal(
		name: string,

		shellPath?: string,

		cwd?: string,
	): Promise<number> {
		CocoonDevLog("service", `[Terminal] Creating terminal: ${name}`);

		// Call Spine (v0.5 Terminal Batch)
		const terminalId = await this.mountainClient.sendRequest(
			"$terminal:create",

			{
				name,
				shell_path: shellPath,
				cwd,
			},
		);

		return terminalId;
	}

	async sendText(terminalId: number, text: string): Promise<void> {
		// Call Spine
		await this.mountainClient.sendRequest("$terminal:sendText", {
			id: terminalId,
			data: text,
		});
	}

	async resize(
		terminalId: number,

		cols: number,

		rows: number,
	): Promise<void> {
		// Call Spine (Method pending in backend wiring, but we can stub it or implement)
		// Let's assume we add terminal.resize to backend if missing, or use a generic call
		CocoonDevLog(
			"service",
			`[Terminal] Resize ${terminalId} to ${cols}x${rows}`,
		);

		// await this.mountainClient.sendRequest("terminal.resize", { id: terminalId, cols, rows });
	}

	async kill(terminalId: number): Promise<void> {
		CocoonDevLog("service", `[Terminal] Kill ${terminalId}`);

		// await this.mountainClient.sendRequest("terminal.kill", { id: terminalId });
	}
}

/**
 * Service Layer
 */
export const TerminalServiceLayer = Layer.effect(
	ITerminalService,

	Effect.gen(function* () {
		const mountainClient = yield* IMountainClientService;
		return new TerminalService(mountainClient);
	}),
);
