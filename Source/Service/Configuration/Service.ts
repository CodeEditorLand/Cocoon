/*
 * File: Cocoon/Source/Service/Configuration/Service.ts
 * Role: Defines the service interface and Effect.Service for the application-level
 *       configuration service, which conforms to the `IConfigurationService` from VS Code.
 * Responsibilities:
 *   - Declare the contract for the Configuration service.
 *   - Provide an `Effect.Service` class that acts as both the service interface
 *     and the dependency injection tag.
 */

import { Effect } from "effect";
import type { IConfigurationService } from "vs/platform/configuration/common/configuration.js";

/**
 * The `Effect.Service` for the Configuration service.
 *
 * This service is responsible for providing access to merged user and workspace
 * settings. It conforms to the `IConfigurationService` interface from VS Code to ensure
 * compatibility with core workbench components. The tag "vscode/ConfigurationService"
 * is used for identification within the dependency injection system.
 */
export class Configuration extends Effect.Service<IConfigurationService>(
	"vscode/ConfigurationService",
) {}
