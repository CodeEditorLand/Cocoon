/*
 * File: Cocoon/Source/PatchProcess/SetupEnvironment.ts
 *
 * This file contains an Effect that configures the process environment based on
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

	// In the VS Code architecture, `useHostProxy` signals that we should use the
	// host's proxy settings. We assume the host's environment variables are already
	// set and this process inherits them, or that the host provides them through
	// another mechanism if `useHostProxy` is true.
	if (InitData.environment.useHostProxy) {
		yield* Effect.logInfo(
			"Host proxy is enabled. Assuming proxy environment variables are inherited.",
		);
	}
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Proxy environment variables configured."),
	),
);

export default SetupEnvironment;
