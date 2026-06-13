/**
 * @module Interfaces/ITerminalService
 * @description
 * Interface definition for Terminal Service.
 */

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

export const ITerminalService: unique symbol = Symbol.for("ITerminalService");
