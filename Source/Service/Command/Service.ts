/*
 * File: Cocoon/Source/Service/Command/Service.ts
 * Role: Defines the service interface and Effect.Service for the Command service.
 * Responsibilities:
 *   - Declare the contract for the service, now directly using the interface
 *     from the original VS Code source for maximum fidelity.
 *   - Provide the `Effect.Service` class that acts as the dependency injection tag.
 */

import { Effect } from "effect";
import type { IExtHostCommands } from "vs/workbench/api/common/extHostCommands.js";

/**
 * The `Effect.Service` for the Command service.
 *
 * This service directly implements the `IExtHostCommands` interface from VS Code's
 * source code. This ensures 1:1 API compatibility. The service is responsible
 * for managing the command palette and direct command invocations.
 */
export class Command extends Effect.Service<IExtHostCommands>(
	"Service/Command",
) {}
