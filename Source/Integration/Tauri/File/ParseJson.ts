/**
 * @module ParseJSON
 * @description Defines a safe Effect for parsing a JSON string.
 */

import { Effect } from "effect";

import { IntegrationConfigurationProblem } from "../Configuration/Problem.js";

/**
 * An Effect that safely parses a JSON string into an object.
 * This is a standard library operation wrapped in an Effect for safety.
 */
export const ParseJSON = (
	JSONString: string,
): Effect.Effect<object, IntegrationConfigurationProblem> =>
	Effect.try({
		try: () => JSON.parse(JSONString),
		catch: (Cause) => new IntegrationConfigurationProblem({ Cause }),
	});
