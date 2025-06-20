

/**
 * @module SetElectronRunAsNode
 * @description An Effect that sets an environment variable to signal that
 * the process is running in a Node.js-like environment, even if under Electron.
 */
import { Effect } from "effect";

/**
 * An Effect that sets the `ELECTRON_RUN_AS_NODE` environment variable to '1'.
 * This is a convention used by many Node.js native modules to adjust their
 * behavior when running inside an Electron renderer or main process, ensuring
 * they function as if in a standard Node.js runtime.
 *
 * This is a synchronous side effect that should be run once at startup.
 */
const SetElectronRunAsNode = Effect.sync(() => {
	process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable."),
	),
);

export default SetElectronRunAsNode;
