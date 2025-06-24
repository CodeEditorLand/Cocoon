/*
 * File: Cocoon/Source/Service/Storage/Live.ts
 * Role: Provides the "live" implementation Layer for the Storage service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Storage` service instance.
 *   - Handles potential errors during initialization by treating them as fatal.
 */

import { Effect, Layer } from "effect";
import { Definition } from "./Definition.js";
import { Storage } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";

/**
 * The live implementation `Layer` for the `Storage` service.
 *
 * It uses `Layer.effect` to construct the service from its `Definition`.
 * The `Definition` effect, which fetches initial storage state via IPC, can fail.
 * Such a failure is considered critical for the application's startup, so `Layer.orDie`
 * is used to treat any error as a fatal defect, ensuring the final `Layer` has a
 * `never` error channel.
 */
const Live: Layer.Layer<Storage, never, IPC | Logger> = Layer.effect(
	Storage,
	Definition,
).pipe(Layer.orDie);

export default Live;
