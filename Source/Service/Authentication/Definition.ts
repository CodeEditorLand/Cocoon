/*
 * File: Cocoon/Source/Service/Authentication/Definition.ts
 * Role: Provides the live implementation of the Authentication service.
 * Responsibilities:
 *   - Instantiates the canonical `NodeExtHostAuthentication` class from VS Code's
 *     source code, which manages all authentication logic.
 *   - Provides our Effect-native services, adapted to the interfaces expected
 *     by the `NodeExtHostAuthentication` constructor.
 */

import { Effect } from "effect";
import { NodeExtHostAuthentication } from "vs/workbench/api/node/extHostAuthentication.js";
import type { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService.js";
import type { IExtHostWindow } from "vs/workbench/api/common/extHostWindow.js";
import type { IExtHostUrls } from "vs/workbench/api/common/extHostUrls.js";
import type { IExtHostProgress } from "vs/workbench/api/common/extHostProgress.js";
import type { ILoggerService } from "vs/platform/log/common/log.js";
import { IPC } from "../IPC/Service.js";
import { InitData } from "../InitData/Service.js";
import { Window } from "../Window/Service.js";
// Assuming Urls and Progress services will be created. For now, we use stubs.
import { Logger } from "../Log/Service.js";

/**
 * An `Effect` that builds the live implementation of the `Authentication` service.
 *
 * This definition demonstrates the "Fidelity-First" pattern by creating an
 * instance of the original `NodeExtHostAuthentication` class. It adapts our
 * services to the interfaces required by its constructor.
 */
const Definition = Effect.gen(function* (Generator) {
	const IPCService = yield* Generator(IPC);
	const InitDataService = yield* Generator(InitData);
	const WindowService = yield* Generator(Window);
	const LoggerService = yield* Generator(Logger);

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

	// --- Stubs for required dependencies that are not yet implemented ---
	const UrlsServiceStub: IExtHostUrls = {
		_serviceBrand: undefined,
		registerUriHandler: () => ({ dispose: () => {} }),
		unregisterUriHandler: () => {},
		createAppUri: (uri) => Promise.resolve(uri),
		get onDidOpenUri() {
			return new Emitter<any>().event;
		},
		resolveExternalUri: () =>
			Promise.resolve({ resolved: "file:///", dispose: () => {} }),
		setDelegate: () => {},
		handleExternalQuery: () => Promise.resolve(false),
	};

	const ProgressServiceStub: IExtHostProgress = {
		_serviceBrand: undefined,
		withProgress: () => Promise.resolve(),
		resolveProgressStep: () => {},
	};

	// Instantiate the original VS Code class, providing our services and stubs.
	const ServiceInstance = new NodeExtHostAuthentication(
		RpcServiceAdapter,
		InitDataService,
		WindowService as IExtHostWindow, // Cast as the full interface is implemented by our Window service + stubs.
		UrlsServiceStub,
		ProgressServiceStub,
		LoggerService as ILoggerService, // Cast as it matches the required methods.
		LoggerService, // The second LogService is for the base logger.
	);

	return ServiceInstance;
});

export default Definition;
