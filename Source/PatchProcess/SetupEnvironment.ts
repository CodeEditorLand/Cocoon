/**
 * @module SetupEnvironment
 * @description An Effect that configures the process environment based on
 * initial data from the host, specifically handling proxy settings.
 */
import { Effect } from "effect";

import InitDataService from "../Service/InitData/Service.js";

/**
 * An Effect that reads proxy settings from the `InitData` service and sets
 * the corresponding `http_proxy` and `https_proxy` environment variables.
 *
 * This is crucial for extensions that need to make outbound network requests
 * in environments behind a corporate proxy. This Effect must be run after
 * the `InitData` service is available but before any extension code that might
 * make a network request is executed.
 */
const SetupEnvironment = Effect.gen(function* () {
	const InitData = yield* InitDataService;

	// If a proxy is configured on the host, propagate it to this process's environment.
	if ((InitData.environment ).proxy) {
		process.env["http_proxy"] = (InitData.environment ).proxy;
		process.env["https_proxy"] = (InitData.environment ).proxy;
	}
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Proxy environment variables configured."),
	),
);

export default SetupEnvironment;
