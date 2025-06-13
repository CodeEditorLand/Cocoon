/**
 * @module Error (Configuration)
 * @description Defines custom, tagged errors for the Configuration service.
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
	get message() {
		return `Failed to update configuration for key '${this.key}'.`;
	}
}
