/*
 * File: Cocoon/Source/Service/Terminal/Service.ts
 * Role: Defines the service interface and Effect.Service for the Terminal service.
 * Responsibilities:
 *   - Declare the contract for the service that provides the `vscode.window.terminals`
 *     and `vscode.window.createTerminal` APIs.
 *   - Provide the `Effect.Service` class for dependency injection, directly using
 *     the `IExtHostTerminalService` interface for maximum fidelity.
 */

import { Effect } from "effect";
import type { IExtHostTerminalService } from "vs/workbench/api/common/extHostTerminalService.js";

/**
 * The `Effect.Service` for the `Terminal` service.
 *
 * This service directly implements the `IExtHostTerminalService` interface from
 * VS Code's source code. It is responsible for creating, managing, and exposing
 * the state of all integrated terminal instances.
 */
export class Terminal extends Effect.Service<IExtHostTerminalService>(
	"Service/Terminal",
) {}
