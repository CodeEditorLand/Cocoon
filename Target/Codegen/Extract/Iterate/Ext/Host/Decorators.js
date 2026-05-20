var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Codegen/Extract/Is/Ext/Host/File.ts
var ExtHostPathSegments = [
  "vs/workbench/api/common/extHost",
  "vs/workbench/api/browser/extHost",
  "vs/workbench/api/worker/extHost",
  "vs/workbench/api/electron-browser/extHost"
];
var IsExtHostFile = /* @__PURE__ */ __name((sourcePath) => {
  const Normalised = sourcePath.replace(/\\/g, "/");
  for (const Segment of ExtHostPathSegments) {
    if (Normalised.includes(Segment)) return true;
  }
  return false;
}, "IsExtHostFile");
var File_default = IsExtHostFile;

// Source/Codegen/Extract/Iterate/Ext/Host/Decorators.ts
import { ExtractDecoratorMatches } from "@codeeditorland/wind/Target/Codegen/Extract/ExtractDecoratorMatch.js";
import { ExtractInterfaceMembers } from "@codeeditorland/wind/Target/Codegen/Extract/ExtractInterfaceMembers.js";
import { ResolveInterfaceCrossFile } from "@codeeditorland/wind/Target/Codegen/Resolve/ResolveInterfaceCrossFile.js";
var MainThreadCounterpartName = /* @__PURE__ */ __name((decoratorName) => {
  if (!decoratorName.startsWith("IExtHost")) return null;
  const Suffix = decoratorName.slice("IExtHost".length);
  return `MainThread${Suffix}Shape`;
}, "MainThreadCounterpartName");
var FindInterfaceDocComment = /* @__PURE__ */ __name((source, interfaceName) => {
  const Pattern = new RegExp(
    `((?:\\s*\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)*)(?:export\\s+)?interface\\s+${interfaceName}\\b`
  );
  const Match = Pattern.exec(source);
  if (!Match) return null;
  const DocBlock = /\/\*\*([\s\S]*?)\*\//.exec(Match[1] ?? "");
  if (!DocBlock) return null;
  return (DocBlock[1] ?? "").split(/\r?\n/).map(
    (line) => line.replace(/^\s*\/?\*+\/?/, "").replace(/\*+\/?$/, "").trim()
  ).filter((line) => line.length > 0).join("\n");
}, "FindInterfaceDocComment");
var IterateExtHostDecorators = /* @__PURE__ */ __name(async function* (files) {
  for await (const File of files) {
    if (!IsExtHostFile(File.SourcePath)) continue;
    const Matches = ExtractDecoratorMatches(File.Contents);
    if (Matches.length === 0) continue;
    for (const Match of Matches) {
      let Members = ExtractInterfaceMembers(
        File.Contents,
        Match.InterfaceName
      );
      let InterfaceDoc = FindInterfaceDocComment(
        File.Contents,
        Match.InterfaceName
      );
      if (Members.length === 0) {
        const CrossFile = await ResolveInterfaceCrossFile({
          InterfaceName: Match.InterfaceName,
          DecoratorFilePath: File.AbsolutePath,
          DecoratorFileContents: File.Contents
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
          Match.DecoratorName
        )
      };
    }
  }
}, "IterateExtHostDecorators");
var Decorators_default = IterateExtHostDecorators;
export {
  IterateExtHostDecorators,
  Decorators_default as default
};
//# sourceMappingURL=Decorators.js.map
