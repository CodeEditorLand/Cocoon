

/**
 * @module Release (IPC/Client)
 * @description Defines the `Effect` for gracefully closing the gRPC client
 * connection to the Mountain host.
 */

import type * as GRPC from "@grpc/grpc-js";
import { Effect } from "effect";

import type { MountainService } from "../Generated.js";

type ClientInstance = MountainService & GRPC.Client;

/**
 * An `Effect` that closes the gRPC client connection.
 *
 * This is designed to be used as the release action in an `acquireRelease`
 * constructor, ensuring that the connection to `Mountain` is properly torn
 * down when the application scope ends.
 *
 * @param Client The gRPC client instance to close.
 */
const Release = (Client: ClientInstance) => {
	return Effect.sync(() => {
		Client.close(); // The generated client has a close() method
	}).pipe(Effect.tap(() => Effect.logInfo("gRPC client connection closed.")));
};

export default Release;
