/*
 * File: Cocoon/Source/Service/LanguageFeature/Live.ts
 * Role: Provides the "live" implementation Layer for the LanguageFeature service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `LanguageFeature` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { LanguageFeature } from "./Service.js";
import { Command } from "../Command/Service.js";
import { Document } from "../Document/Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `LanguageFeature` service.
 * It has several core dependencies for handling RPC calls, including `IPC` for
 * transport, `Document` for accessing document state, and `Command` for
 * converting command objects.
 */
const Live: Layer.Layer<LanguageFeature, never, IPC | Document | Command> =
	Layer.effect(LanguageFeature, Definition);

export default Live;
