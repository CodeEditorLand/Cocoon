/**
 * @module InitData
 * @description Defines a simple service to hold the initial data payload sent from the
 * Mountain host process upon startup. This data is critical for bootstrapping
 * many other services.
 */

import { Effect } from "effect";

/**
 * @interface IExtensionHostInitData
 * @description A placeholder interface representing the initial data payload
 * that the application might receive upon startup. In a real application, this
 * would be a rich, well-defined contract.
 */
interface IExtensionHostInitData {
	readonly extensions: { readonly allExtensions: readonly any[] };
	readonly environment: any;
	readonly logLevel: any;
	readonly remote: any;
	readonly telemetryInfo: any;
	readonly uiKind: any;
	readonly quality: any;
	readonly workspace: any;
}

/**
 * @description A dummy instance of IExtensionHostInitData used for initializing
 * services that require it, without needing a real data source. This is
 * necessary because the service must be constructed with *some* data.
 */
const DummyInitData: IExtensionHostInitData = {
	extensions: { allExtensions: [] },
	environment: {},
	logLevel: 0,
	remote: {},
	telemetryInfo: {},
	uiKind: 0,
	quality: "",
	workspace: {},
};

/**
 * @class InitData
 * @description The `Effect.Service` for the InitData service. It acts as an
 * immutable container for the `IExtensionHostInitData` received at startup.
 * The default implementation provides dummy data, but in the final application,
 * this will be replaced with a layer constructed from real data received via IPC.
 */
export class InitDataService extends Effect.Service<InitDataService>()(
	"Service/InitData",
	{
		sync: () => DummyInitData,
	},
) {}
