/**
 * @module Release (IPC/Server)
 * @description Defines the `Effect` for gracefully shutting down the `Cocoon`
 * gRPC server.
 */

import { Effect } from "effect";

import { IPCError } from "../Error.js";
import type { Interface as ServerService } from "./Service.js";

/**
 * An `Effect` that gracefully shuts down the gRPC server.
 *
 * This is designed to be used as the release action in an `acquireRelease`
 * constructor. It wraps the callback-based `tryShutdown` method in a promise,
 * ensuring it integrates cleanly into the `Effect` ecosystem.
 *
 * @param Server The gRPC server instance to shut down.
 */
export function Release(Server: ServerService) {
	return Effect.tryPromise({
		try: () =>
			new Promise<void>((resolve, reject) =>
				Server.tryShutdown((error) =>
					error ? reject(error) : resolve(),
				),
			),
		catch: (Cause) =>
			new IPCError({
				cause: Cause,
				context: "gRPC server shutdown failed",
			}),
	}).pipe(Effect.tap(() => Effect.logInfo("Cocoon gRPC server shut down.")));
}
