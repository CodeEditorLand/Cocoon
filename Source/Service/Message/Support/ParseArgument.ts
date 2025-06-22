/*
 * File: Cocoon/Source/Service/Message/Support/ParseArgument.ts
 *
 * This file contains a helper function to parse the overloaded arguments of the
 * `show...Message` API calls.
 */

import type { MessageItem, MessageOptions } from "vscode";

import type ExtensionSource from "../Type.js";

interface ParsedArguments {
	Option: MessageOptions;
	Items: (string | MessageItem)[];
	Source?: ExtensionSource;
}

/**
 * Parses the variable-length arguments of a `show...Message` call into a
 * structured object.
 * @param Arguments The array of arguments passed to the function.
 * @returns A `ParsedArguments` object.
 */
export default (Arguments: any[]): ParsedArguments => {
	let Option: MessageOptions = {};
	let Items: (string | MessageItem)[] = [];
	let Source: ExtensionSource | undefined = undefined;
	let CurrentIndex = 0;

	// Check for MessageOptions (it's an object, but not a MessageItem or ExtensionSource)
	if (
		Arguments.length > CurrentIndex &&
		typeof Arguments[CurrentIndex] === "object" &&
		Arguments[CurrentIndex] !== null &&
		!(Arguments[CurrentIndex] as MessageItem).title &&
		!(Arguments[CurrentIndex] as ExtensionSource).id
	) {
		Option = Arguments[CurrentIndex++];
	}

	// Check for ExtensionSource (it has an 'id' property)
	if (
		Arguments.length > CurrentIndex &&
		typeof Arguments[CurrentIndex] === "object" &&
		Arguments[CurrentIndex] !== null &&
		typeof (Arguments[CurrentIndex] as ExtensionSource).id === "string"
	) {
		Source = Arguments[CurrentIndex++];
	}

	// The rest of the arguments are considered message items.
	Items = Arguments.slice(CurrentIndex).filter(
		(item): item is string | MessageItem =>
			typeof item === "string" ||
			(typeof item === "object" &&
				item !== null &&
				typeof item.title === "string"),
	);

	return { Option, Items, Source };
};
