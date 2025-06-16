/*
 * File: Cocoon/Source/Service/Configuration/Error/ConfigurationUpdateError.ts
 * Responsibility: Defines a custom error for configuration update failures.
 *
 * Last-Modified: 2025-06-18
 */

import { Data } from "effect";

/**
 * An error indicating that an attempt to update a configuration value failed.
 * This could be due to permission issues, invalid values, or IPC failures.
 */
export class ConfigurationUpdateError extends Data.TaggedError(
	"ConfigurationUpdateError",
)<{
	readonly key: string;
	readonly cause: unknown;
}> {
	constructor(properties: { readonly key: string; readonly cause: unknown }) {
		super(properties);
		this.message = `Failed to update configuration for key '${this.key}'.`;
	}
	public override readonly message: string;
}

export default ConfigurationUpdateError;
