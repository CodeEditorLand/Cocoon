/**
 * @module Codegen/Extract/IterateExtHostDecorators
 * @description
 * Cocoon-side async iterator that filters Wind's source-tree walker
 * to the extension-host subtree (`IsExtHostFile`) and emits one
 * `ExtHostDecoratorRecord` per `createDecorator(...)` site. Reuses
 * Wind's existing extractors verbatim - no parser duplication.
 *
 * For every `IExtHostFoo` decorator the iterator looks for the
 * paired `MainThreadFoo` decorator in the same file or in the
 * neighbouring `mainThreadFoo.ts` and records it as the RPC
 * counterpart. The downstream emitter wires both ends so a
 * Cocoon-side bridge knows which renderer-side service it is
 * mirroring.
 * @category Extract
 */

import { ExtractDecoratorMatches } from "@codeeditorland/wind/Target/Codegen/Extract/ExtractDecoratorMatch.js";
import { ExtractInterfaceMembers } from "@codeeditorland/wind/Target/Codegen/Extract/ExtractInterfaceMembers.js";
import { ResolveInterfaceCrossFile } from "@codeeditorland/wind/Target/Codegen/Resolve/ResolveInterfaceCrossFile.js";
import type { SourceFile } from "@codeeditorland/wind/Target/Codegen/Walk/SourceTreeWalker.js";

import type { ExtHostDecoratorRecord } from "../../../../Type/Ext/Host/Decorator/Record.js";
import { IsExtHostFile } from "../../../Is/Ext/Host/File.js";

const MainThreadCounterpartName = (decoratorName: string): string | null => {
	if (!decoratorName.startsWith("IExtHost")) return null;
	const Suffix = decoratorName.slice("IExtHost".length);
	return `MainThread${Suffix}Shape`;
};

const FindInterfaceDocComment = (
	source: string,
	interfaceName: string,
): string | null => {
	const Pattern = new RegExp(
		`((?:\\s*\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)*)(?:export\\s+)?interface\\s+${interfaceName}\\b`,
	);
	const Match = Pattern.exec(source);
	if (!Match) return null;
	const DocBlock = /\/\*\*([\s\S]*?)\*\//.exec(Match[1] ?? "");
	if (!DocBlock) return null;
	return (DocBlock[1] ?? "")
		.split(/\r?\n/)
		.map((line) =>
			line
				.replace(/^\s*\/?\*+\/?/, "")
				.replace(/\*+\/?$/, "")
				.trim(),
		)
		.filter((line) => line.length > 0)
		.join("\n");
};

export const IterateExtHostDecorators = async function* (
	files: AsyncIterable<SourceFile>,
): AsyncIterableIterator<ExtHostDecoratorRecord> {
	for await (const File of files) {
		if (!IsExtHostFile(File.SourcePath)) continue;
		const Matches = ExtractDecoratorMatches(File.Contents);
		if (Matches.length === 0) continue;
		for (const Match of Matches) {
			let Members = ExtractInterfaceMembers(
				File.Contents,
				Match.InterfaceName,
			);
			let InterfaceDoc = FindInterfaceDocComment(
				File.Contents,
				Match.InterfaceName,
			);
			if (Members.length === 0) {
				const CrossFile = await ResolveInterfaceCrossFile({
					InterfaceName: Match.InterfaceName,
					DecoratorFilePath: File.AbsolutePath,
					DecoratorFileContents: File.Contents,
				});
				if (CrossFile) {
					Members = CrossFile.Members;
				}
			}
			yield {
				DecoratorName: Match.DecoratorName,
				DecoratorTag: Match.DecoratorTag,
				InterfaceName: Match.InterfaceName,
				SourcePath: File.SourcePath,
				SourceLine: Match.SourceLine,
				Members,
				DecoratorDocComment: Match.DocComment,
				InterfaceDocComment: InterfaceDoc,
				MainThreadCounterpart: MainThreadCounterpartName(
					Match.DecoratorName,
				),
			};
		}
	}
};

export default IterateExtHostDecorators;
