/**
 * @module Authentication
 * @description Defines the service for implementing the `vscode.authentication` API.
 * This service directly implements the `IExtHostAuthentication` interface from
 * VS Code's source code for maximum fidelity, handling authentication providers,
 * sessions, and the authentication flows required by extensions.
 */

import { Effect } from "effect";
import type { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication.js";
import { NodeExtHostAuthentication } from "vs/workbench/api/node/extHostAuthentication.js";
import type { IExtHostRpcService } from "vs/workbench/api/common/extHostRpcService.js";
import type { IExtHostWindow } from "vs/workbench/api/common/extHostWindow.js";
import type { ExtHostUrls as IExtHostUrls } from "vs/workbench/api/common/extHostUrls.js";
import type { IExtHostProgress } from "vs/workbench/api/common/extHostProgress.js";
import type { ILoggerService } from "vs/platform/log/common/log.js";
import { Emitter } from "vs/base/common/event.js";
import { IPCService } from "./IPC.js";
import { InitDataService } from "./InitData.js";
import { WindowService } from "./Window.js";
import { LoggerService } from "./Logger.js";
import type { IExtHostInitDataService } from "vs/workbench/api/common/extHostInitDataService.js";

/**
 * @class AuthenticationService
 * @description The `Effect.Service` for the Authentication service.
 */
export class AuthenticationService extends Effect.Service<IExtHostAuthentication>()(
	"Service/Authentication",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const InitData = yield* InitDataService;
			const Window = yield* WindowService;
			const Logger = yield* LoggerService;

			const RpcServiceAdapter: IExtHostRpcService = {
				_serviceBrand: undefined,
				getProxy: <T>(Identifier: any): T =>
					IPC.CreateProxy(Identifier.path),
				set: <T, R extends T>(_id: any, _instance: R) => _instance,
				dispose: () => {},
				assertRegistered: () => {},
				drain: () => Promise.resolve(),
			};

			const UrlsServiceStub: IExtHostUrls = {
				_serviceBrand: undefined,
				registerUriHandler: () => ({ dispose: () => {} }),
				unregisterUriHandler: () => {},
				createAppUri: (uri) => Promise.resolve(uri),
				get onDidOpenUri() {
					return new Emitter<any>().event;
				},
				resolveExternalUri: () =>
					Promise.resolve({
						resolved: "file:///",
						dispose: () => {},
					}),
				setDelegate: () => {},
				handleExternalQuery: () => Promise.resolve(false),
			};

			const ProgressServiceStub: IExtHostProgress = {
				_serviceBrand: undefined,
				withProgress: <R>() => Promise.resolve(undefined as R),
				resolveProgressStep: () => {},
			};

			return new NodeExtHostAuthentication(
				RpcServiceAdapter,
				InitData as unknown as IExtHostInitDataService,
				Window as unknown as IExtHostWindow,
				UrlsServiceStub,
				ProgressServiceStub,
				Logger as unknown as ILoggerService,
				Logger as unknown as ILoggerService,
			);
		}),
	},
) {}
