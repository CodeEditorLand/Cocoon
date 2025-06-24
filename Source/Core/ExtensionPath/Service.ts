/*
 * File: Cocoon/Source/Core/ExtensionPath/Service.ts
 * Role: Defines the interface and Effect.Service for the ExtensionPath service.
 * Responsibilities:
 *   - Declare the contract for the service that maps file URIs to their
 *     owning extension.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";

/**
 * The `Effect.Service` for the `ExtensionPath` service.
 *
 * This service maintains an index of installed extension paths, allowing for
 * quick, synchronous lookups to determine which extension owns a given file URI.
 * This is a critical dependency for both the `RequireInterceptor` and `ESMInterceptor`.
 */
export class ExtensionPath extends Effect.Service<ExtensionPath>(
	"Core/ExtensionPath",
)<{
	/**
	 * Synchronously finds the extension that a given file URI belongs to by
	 * checking if the URI's path is a child of any known extension path.
	 * @param PathURI - The `Uri` to check.
	 * @returns An `IExtensionDescription` if a match is found, otherwise `undefined`.
	 */
	readonly FindSubstr: (PathURI: Uri) => IExtensionDescription | undefined;
}>() {}
