/**
 * @module ParseArguments (Message/Support)
 * @description A helper function to parse the overloaded arguments of `show...Message` calls.
 */

import type { MessageItem, MessageOptions } from "vscode";

import type { ExtensionSource } from "../Type.js";

interface ParsedArguments {
	Options: MessageOptions;
	Items: (string | MessageItem)[];
	Source?: ExtensionSource;
}

export const ParseArguments = (Args: any[]): ParsedArguments => {
	let Options: MessageOptions = {};
	let Items: (string | MessageItem)[] = [];
	let Source: ExtensionSource | undefined = undefined;
	let CurrentIndex = 0;

	// Check for MessageOptions
	if (
		Args.length > CurrentIndex &&
		typeof Args[CurrentIndex] === "object" &&
		Args[CurrentIndex] !== null &&
		!(Args[CurrentIndex] as MessageItem).title &&
		!(Args[CurrentIndex] as ExtensionSource).id
	) {
		Options = Args[CurrentIndex++];
	}

	// Check for ExtensionSource
	if (
		Args.length > CurrentIndex &&
		typeof Args[CurrentIndex] === "object" &&
		Args[CurrentIndex] !== null &&
		typeof (Args[CurrentIndex] as ExtensionSource).id === "string"
	) {
		Source = Args[CurrentIndex++];
	}

	// The rest are items
	Items = Args.slice(CurrentIndex).filter(
		(item): item is string | MessageItem =>
			typeof item === "string" ||
			(typeof item === "object" &&
				item !== null &&
				typeof item.title === "string"),
	);

	return { Options, Items, Source };
};
