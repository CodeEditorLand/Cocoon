/**
 * @module InitData
 * @description Defines a simple service to hold the initial data payload sent from the
 * Mountain host process upon startup. This data is critical for bootstrapping
 * many other services.
 */

import type { IExtensionHostInitData } from "@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js";
import { Effect } from "effect";
import { LogLevel, UIKind } from "vscode";

/**
 * @description A dummy instance of IExtensionHostInitData used for initializing
 * services that require it, without needing a real data source. This is
 * necessary because the service must be constructed with *some* data.
 */
const DummyInitData: IExtensionHostInitData = {
	version: "1.85.0",
	quality: "stable",
	commit: "dev",
	parentPid: 0,
	environment: {
		isExtensionDevelopmentDebug: false,
		appName: "Cocoon",
		appHost: "desktop",
		appLanguage: "en",
		isExtensionTelemetryLoggingOnly: false,
		appUriScheme: "cocoon-code",
		globalStorageHome: {} as any,
		workspaceStorageHome: {} as any,
	},
	workspace: null,
	extensions: {
		versionId: 0,
		allExtensions: [],
		activationEvents: {},
		myExtensions: [],
	},
	telemetryInfo: {
		sessionId: "",
		machineId: "",
		sqmId: "",
		devDeviceId: "",
		firstSessionDate: new Date().toISOString(),
	},
	logLevel: LogLevel.Info,
	loggers: [],
	logsLocation: {} as any,
	autoStart: false,
	remote: { isRemote: false, authority: undefined, connectionData: null },
	consoleForward: { includeStack: false, logNative: false },
	uiKind: UIKind.Desktop,
};

/**
 * @class InitData
 * @description The `Effect.Service` for the InitData service. It acts as an
 * immutable container for the `IExtensionHostInitData` received at startup.
 * The default implementation provides dummy data, but in the final application,
 * this will be replaced with a layer constructed from real data received via IPC.
 */
export class InitDataService extends Effect.Service<IExtensionHostInitData>()(
	"Service/InitData",
	{
		sync: () => DummyInitData,
	},
) {}
