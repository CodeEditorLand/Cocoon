/*
 * File: Cocoon/Source/Service/Authentication/Service.ts
 * Role: Defines the service interface and Effect.Service for the Authentication service.
 * Responsibilities:
 *   - Declare the contract for the service that implements the `vscode.authentication` API.
 *   - Provide the `Effect.Service` class for dependency injection, directly using
 *     the `IExtHostAuthentication` interface for maximum fidelity.
 */

import { Effect } from "effect";
import type { IExtHostAuthentication } from "vs/workbench/api/common/extHostAuthentication.js";

/**
 * The `Effect.Service` for the Authentication service.
 *
 * This service directly implements the `IExtHostAuthentication` interface from
 * VS Code's source code. It is responsible for managing authentication providers,
 * sessions, and handling the authentication flows required by extensions.
 */
export class Authentication extends Effect.Service<IExtHostAuthentication>(
	"Service/Authentication",
) {}
