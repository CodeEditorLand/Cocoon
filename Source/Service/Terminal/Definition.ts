/*
 * File: Cocoon/Source/Service/Terminal/Definition.ts
 * Role: Provides the live implementation of the Terminal service.
 * Responsibilities:
 *   - Instantiate the canonical `ExtHostTerminalService` from VS Code's source code,
 *     which manages the logic for all terminal instances.
 *   - This demonstrates the "Fidelity-First" pattern, reusing original VS Code logic.
 *   - The original class is platform-agnostic, and our `IPC` service will handle
 *     the communication with the native host (`Mountain`).
 */

import { Effect } from "effect";
import { ExtHostTerminalService } from "vs/workbench/api/node/extHostTerminalService.js";
import { MainContext } from "vs/workbench/api/common/extHost.protocol.js";
import type { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService.js";
import { Command } from "../Command/Service.js";
import type { IExtHostCommands } from "vs/workbench/api/common/extHostCommands.js";
import { IPC } from "../IPC/Service.js";

/**
 * An `Effect` that builds the live implementation of the `Terminal` service.
 *
 * This definition instantiates the original `ExtHostTerminalService` class from
 * VS Code's source. It provides our `Command` service and an RPC adapter for the
 * `IPC` service to satisfy its dependencies.
 */
const Definition = Effect.gen(function* (Generator) {
	const CommandService = yield* Generator(Command);
	const IPCService = yield* Generator(IPC);

	/**
	 * An adapter to make our `IPC.Service` conform to the `IExtHostRpcService`.
	 */
	const RpcServiceAdapter: IExtHostRpcService = {
		_serviceBrand: undefined,
		getProxy: <T>(Identifier: any): T =>
			IPCService.CreateProxy(Identifier.path),
		set: () => ({}) as any,
		dispose: () => {},
	};

	// Instantiate the original VS Code class, providing our services as dependencies.
	// We cast our `Command` service to the expected `IExtHostCommands` interface.
	const ServiceInstance = new ExtHostTerminalService(
		true, // `isProcessReady` - we assume true for our Node.js host.
		CommandService as IExtHostCommands,
		RpcServiceAdapter,
	);

	return ServiceInstance;
});

export default Definition;
