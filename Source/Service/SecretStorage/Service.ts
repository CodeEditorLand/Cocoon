/*
 * File: Cocoon/Source/Service/SecretStorage/Service.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:53 UTC
 * Dependency: effect, vscode
 * Export: SecretStorageService
 */

/**
 * @module Service (SecretStorage)
 * @description Defines the interface and Context.Tag for the SecretStorage service factory.
 * This service is responsible for creating `SecretStorage` instances that are scoped
 * to a specific extension.
 */

import { Context } from "effect";
import type { SecretStorage } from "vscode";

/**
 * The `Context.Tag` for the SecretStorage service factory.
 */
export default class SecretStorageService extends Context.Tag(
	"Service/SecretStorage",
)<
	SecretStorageService,
	{
		/**
		 * Creates a `SecretStorage` instance for a given extension.
		 * @param ExtensionID The ID of the extension requesting the storage.
		 * @returns A `SecretStorage` instance.
		 */
		readonly CreateStorage: (ExtensionID: string) => SecretStorage;
	}
>() {}
