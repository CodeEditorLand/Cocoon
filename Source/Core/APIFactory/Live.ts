/*
 * File: Cocoon/Source/Core/APIFactory/Live.ts
 * Role: Provides the "live" implementation Layer for the APIFactory service.
 * Responsibilities:
 *   - This module defines the `Layer` that constructs the live `APIFactory` service,
 *     providing it with all of its necessary service dependencies.
 */

import { Layer } from "effect";
import { APIDeprecation } from "../../Service/APIDeprecation/Service.js";
import { Command } from "../../Service/Command/Service.js";
import { Debug } from "../../Service/Debug/Service.js";
import { Document } from "../../Service/Document/Service.js";
import { Extension } from "../../Service/Extension/Service.js";
import { LanguageFeature } from "../../Service/LanguageFeature/Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { ProposedAPI } from "../../Service/ProposedAPI/Service.js";
import { StatusBar } from "../../Service/StatusBar/Service.js";
import { Task } from "../../Service/Task/Service.js";
import { TreeView } from "../../Service/TreeView/Service.js";
import { WebViewPanel } from "../../Service/WebViewPanel/Service.js";
import { Window } from "../../Service/Window/Service.js";
import { Workspace } from "../../Service/WorkSpace/Service.js";
import { Definition } from "./Definition.js";
import { APIFactory } from "./Service.js";

/**
 * The live implementation `Layer` for the `APIFactory` service.
 *
 * It uses `Layer.effect` to construct the service from its `Definition`.
 * The dependencies listed in the third type parameter represent the "world"
 * of services that must be available in the context for this layer to be built.
 * This is a high-level service that depends on nearly every other application service.
 */
const Live: Layer.Layer<
	APIFactory,
	never,
	| Logger
	| ProposedAPI
	| APIDeprecation
	| Command
	| Workspace
	| Document
	| Window
	| LanguageFeature
	| Debug
	| Task
	| Extension
	| WebViewPanel
	| TreeView
	| StatusBar
> = Layer.effect(APIFactory, Definition);

export default Live;
