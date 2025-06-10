/**
 * @module Release
 * @description Defines the `Effect` for gracefully closing the gRPC client
 * connection.
 */

import { Effect } from "effect";

import type { Service } from "./Service.js";

/**
 * An `Effect` that closes the gRPC client connection.
 *
 * This is designed to be used as the release action in an `acquireRelease`
 * constructor, ensuring that the connection to `Mountain` is properly torn
 * down when the application scope ends.
 *
 * @param Client The gRPC client instance to close.
 */
export const Release = (Client: Service) =>
	Effect.sync(() => {
		Client.close();
	}).pipe(Effect.tap(() => Effect.logInfo("gRPC client connection closed.")));
