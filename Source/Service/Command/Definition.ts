/*
 * File: Cocoon/Source/Service/Command/Definition.ts
 * Role: Provides the live implementation of the Command service.
 * Responsibilities:
 *   - This module directly instantiates the canonical `ExtHostCommands` class from
 *     VS Code's source code, following the "Fidelity-First" pattern.
 *   - It provides our Effect-native services (like `IPC` and `Log`) to the
 *     constructor of `ExtHostCommands` to satisfy its dependencies.
 */

import { Effect } from "effect";
import { ExtHostCommands } from "vs/workbench/api/node/extHostCommands.js";
import { MainContext } from "vs/workbench/api/common/extHost.protocol.js";
import { ILogService } from "vs/platform/log/common/log.js";
import { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService.js";
import { IPC } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";
import { ExtensionHost } from "../../Core/ExtensionHost/Service.js";

/**
 * An `Effect` that builds the live implementation of the `Command` service.
 *
 * This definition demonstrates the "Fidelity-First" pattern by creating an
 * instance of the original `ExtHostCommands` class from VS Code's source.
 * We adapt our `IPC.Service` to the `IExtHostRpcService` interface that the
 * constructor expects.
 */
const Definition = Effect.gen(function* (Generator) {
	const IPCService = yield* Generator(IPC);
	const LogService = yield* Generator(Logger);
	const ExtensionHostService = yield* Generator(ExtensionHost);

	/**
	 * An adapter that makes our `IPC.Service` conform to the `IExtHostRpcService`
	 * interface expected by VS Code's services.
	 */
	const RpcServiceAdapter: IExtHostRpcService = {
		_serviceBrand: undefined,
		getProxy: <T>(identifier: any): T => {
			// `getProxy` is used to create a proxy to a MainThread service.
			// Our `IPC.Service` already provides a more generic `CreateProxy`.
			// We assume the identifier's path is the channel name.
			const channel = identifier.path;
			return IPCService.CreateProxy(channel);
		},
		set: () => {
			// This is for registering ExtHost parts, which we handle via Layers.
			return {} as any;
		},
		dispose: () => {},
	};

	// The `ExtHostCommands` constructor expects the RPC proxy for `MainThreadCommands`.
	const MainThreadCommandsProxy = RpcServiceAdapter.getProxy(
		MainContext.MainThreadCommands,
	);

	// Instantiate the original VS Code class, providing our services as dependencies.
	const ServiceInstance = new ExtHostCommands(
		RpcServiceAdapter,
		MainThreadCommandsProxy,
		LogService,
	);

	// The `ExtHostCommands` class has an `$onExtensionActivated` method that needs
	// to be connected to our `ExtensionHost` service. This is a crucial part of
	// adapting the original class to our system.
	Effect.runFork(
		ExtensionHostService.OnDidActivateExtension((Extension) =>
			// @ts-expect-error - This is a private method we are calling for integration.
			ServiceInstance.$onExtensionActivated(Extension),
		),
	);

	return ServiceInstance;
});

export default Definition;
