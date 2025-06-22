/*
 * File: Cocoon/Source/Service/Terminal/Service.ts
 * Role: Defines the interface and Context.Tag for the Terminal service.
 * Responsibilities:
 *   1. Declare the contract for the Terminal service, which provides access to
 *      creating and managing terminal instances.
 *   2. This is the public API surface consumed by other services or the API factory.
 */

import { Context } from "effect";
import type { Event, Terminal, TerminalOptions } from "vscode";

export default class TerminalService extends Context.Tag("Service/Terminal")<
	TerminalService,
	{
		/**
		 * The currently active terminal.
		 */
		readonly activeTerminal: Terminal | undefined;

		/**
		 * A list of all open terminals.
		 */
		readonly terminals: readonly Terminal[];

		/**
		 * An event that fires when the active terminal has changed.
		 */
		readonly onDidChangeActiveTerminal: Event<Terminal | undefined>;

		/**
		 * An event that fires when a terminal has been opened.
		 */
		readonly onDidOpenTerminal: Event<Terminal>;

		/**
		 * An event that fires when a terminal has been closed.
		 */
		readonly onDidCloseTerminal: Event<Terminal>;

		/**
		 * Creates a new terminal instance.
		 * @param OptionsOrName The options for the new terminal, or just its name.
		 * @returns A new `Terminal` instance.
		 */
		readonly createTerminal: (
			OptionsOrName?: TerminalOptions | string,
		) => Terminal;
	}
>() {}
