/*
 * File: Cocoon/Source/Service/LanguageFeature/Live.ts
 * Responsibility: Implements the live layer for the LanguageFeature service using Effect, integrating with Mountain's Track dispatcher and Vine IPC layer to handle RPC calls for language features between the Sky frontend and Cocoon sidecar.
 * Modified: 2025-06-17 10:35:18 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (LanguageFeature)
 * @description The live implementation Layer for the LanguageFeature service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the LanguageFeature service.
 * It has many core dependencies for handling RPC calls, including IPC for
 * transport, Document for accessing document state, Cancellation for handling
 * cancellation signals, and Command for converting command objects.
 */
export default Layer.effect(Service, Definition);
