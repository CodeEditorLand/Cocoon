/*
 * File: Cocoon/Source/Service/WebViewPanel/Live.ts
 * Role: Provides the "live" implementation Layer for the WebViewPanel service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `WebViewPanel` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { WebViewPanel } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `WebViewPanel` service.
 * It depends on the `IPC` service for all communication with the host.
 */
const Live: Layer.Layer<WebViewPanel, never, IPC> = Layer.effect(
	WebViewPanel,
	Definition,
);

export default Live;
