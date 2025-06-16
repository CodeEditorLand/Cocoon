/*
 * File: Cocoon/Source/PatchProcess/SetupEnvironment.ts
 * Responsibility: Configures proxy environment variables based on the Mountain backend's InitData service to enable network communication for extensions running in the Cocoon Node.js sidecar.
 * Modified: 2025-06-16 14:00:34 UTC
 * Dependency: ../Service/InitData/Service.js, effect
 */

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
	if (InitData.environment.httpProxy) {
		process.env["http_proxy"] = InitData.environment.httpProxy;
	}
	if (InitData.environment.httpsProxy) {
		process.env["https_proxy"] = InitData.environment.httpsProxy;
	}
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Proxy environment variables configured."),
	),
);

export default SetupEnvironment;
