var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/Glob/To/Regex.ts
var FindMatchingBrace = /* @__PURE__ */ __name((Input, Start, Open, Close) => {
  let Depth = 1;
  for (let I = Start + 1; I < Input.length; I++) {
    const Character = Input[I];
    if (Character === "\\") {
      I++;
      continue;
    }
    if (Character === Open) Depth++;
    else if (Character === Close) {
      Depth--;
      if (Depth === 0) return I;
    }
  }
  return -1;
}, "FindMatchingBrace");
var SplitTopLevelCommas = /* @__PURE__ */ __name((Body) => {
  const Parts = [];
  let Depth = 0;
  let Start = 0;
  for (let I = 0; I < Body.length; I++) {
    const Character = Body[I];
    if (Character === "\\") {
      I++;
      continue;
    }
    if (Character === "{" || Character === "(") Depth++;
    else if (Character === "}" || Character === ")") Depth--;
    else if (Character === "," && Depth === 0) {
      Parts.push(Body.slice(Start, I));
      Start = I + 1;
    }
  }
  Parts.push(Body.slice(Start));
  return Parts;
}, "SplitTopLevelCommas");
var ExpandBraces = /* @__PURE__ */ __name((Input) => {
  const Open = Input.indexOf("{");
  if (Open === -1) return [Input];
  const Close = FindMatchingBrace(Input, Open, "{", "}");
  if (Close === -1) return [Input];
  const Prefix = Input.slice(0, Open);
  const Body = Input.slice(Open + 1, Close);
  const Suffix = Input.slice(Close + 1);
  const RangeMatch = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(Body);
  const Alternatives = [];
  if (RangeMatch) {
    const Start = parseInt(RangeMatch[1], 10);
    const End = parseInt(RangeMatch[2], 10);
    const StepRaw = RangeMatch[3];
    const Step = StepRaw ? Math.abs(parseInt(StepRaw, 10)) : 1;
    if (Step > 0 && Number.isFinite(Start) && Number.isFinite(End)) {
      const Width = RangeMatch[1].startsWith("0") || RangeMatch[2].startsWith("0") ? Math.max(RangeMatch[1].length, RangeMatch[2].length) : 0;
      const Direction = Start <= End ? 1 : -1;
      for (let Value = Start; Direction === 1 ? Value <= End : Value >= End; Value += Direction * Step) {
        const Text = String(Math.abs(Value));
        const Padded = Width > 0 && Text.length < Width ? "0".repeat(Width - Text.length) + Text : Text;
        Alternatives.push(Value < 0 ? `-${Padded}` : Padded);
      }
    }
  }
  if (Alternatives.length === 0) {
    Alternatives.push(...SplitTopLevelCommas(Body));
  }
  const Expanded = [];
  for (const Alternative of Alternatives) {
    for (const Sub of ExpandBraces(Alternative)) {
      for (const Tail of ExpandBraces(Suffix)) {
        Expanded.push(`${Prefix}${Sub}${Tail}`);
      }
    }
  }
  return Expanded;
}, "ExpandBraces");
var RegexEscape = /* @__PURE__ */ __name((Character) => /[.+^$()|\[\]\\]/.test(Character) ? `\\${Character}` : Character, "RegexEscape");
var PlainGlobToRegexSource = /* @__PURE__ */ __name((Glob) => {
  let Expression = "";
  let I = 0;
  while (I < Glob.length) {
    const Character = Glob[I];
    const Next = Glob[I + 1];
    if (Character === "*" && Next === "*") {
      Expression += ".*";
      I += 2;
      if (Glob[I] === "/") I++;
      continue;
    }
    if ((Character === "?" || Character === "*" || Character === "+" || Character === "@" || Character === "!") && Next === "(") {
      const CloseAt = FindMatchingBrace(Glob, I + 1, "(", ")");
      if (CloseAt !== -1) {
        const Inside = Glob.slice(I + 2, CloseAt);
        const Alternatives = SplitTopLevelCommas(
          Inside.replace(/\|/g, ",")
        ).map((Alternative) => PlainGlobToRegexSource(Alternative));
        const Joined = Alternatives.join("|");
        switch (Character) {
          case "?":
            Expression += `(?:${Joined})?`;
            break;
          case "*":
            Expression += `(?:${Joined})*`;
            break;
          case "+":
            Expression += `(?:${Joined})+`;
            break;
          case "@":
            Expression += `(?:${Joined})`;
            break;
          case "!":
            Expression += `(?:(?!(?:${Joined})(?:/|$))[^/])+`;
            break;
        }
        I = CloseAt + 1;
        continue;
      }
    }
    if (Character === "*") {
      Expression += "[^/]*";
      I++;
      continue;
    }
    if (Character === "?") {
      Expression += "[^/]";
      I++;
      continue;
    }
    if (Character === "[") {
      const CloseAt = Glob.indexOf("]", I + 1);
      if (CloseAt !== -1) {
        let Class = Glob.slice(I + 1, CloseAt);
        if (Class.startsWith("!")) Class = `^${Class.slice(1)}`;
        Expression += `[${Class}]`;
        I = CloseAt + 1;
        continue;
      }
    }
    if (Character === "\\" && Next !== void 0) {
      Expression += RegexEscape(Next);
      I += 2;
      continue;
    }
    Expression += RegexEscape(Character);
    I++;
  }
  return Expression;
}, "PlainGlobToRegexSource");
var GlobToRegex = /* @__PURE__ */ __name((Glob) => {
  const Variants = ExpandBraces(Glob);
  const Source = Variants.length === 1 ? PlainGlobToRegexSource(Variants[0]) : `(?:${Variants.map(PlainGlobToRegexSource).join("|")})`;
  return new RegExp(`^${Source}$`);
}, "GlobToRegex");
var Regex_default = GlobToRegex;

// Source/Services/Handler/VscodeAPI/Stock/Lift.ts
import {
  isEmptyPattern as StockGlobIsEmpty,
  match as StockGlobMatch,
  parse as StockGlobParse
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/glob.js";
import {
  basename as StockBasename,
  dirname as StockDirname,
  extname as StockExtname,
  isEqualOrParent as StockIsEqualOrParent,
  joinPath as StockJoinPath,
  relativePath as StockRelativePath
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/resources.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
function ToUri(Input) {
  if (Input == null) return void 0;
  if (Input instanceof URI) return Input;
  if (typeof Input === "string") {
    if (Input.length === 0) return void 0;
    try {
      if (Input.startsWith("file:") || Input.includes("://")) {
        return URI.parse(Input);
      }
      return URI.file(Input);
    } catch {
      return void 0;
    }
  }
  const WithScheme = Input;
  if (typeof WithScheme.scheme === "string") {
    try {
      return URI.from({
        scheme: WithScheme.scheme,
        authority: typeof WithScheme.authority === "string" ? WithScheme.authority : "",
        path: typeof WithScheme.path === "string" ? WithScheme.path : "",
        query: typeof WithScheme.query === "string" ? WithScheme.query : "",
        fragment: typeof WithScheme.fragment === "string" ? WithScheme.fragment : ""
      });
    } catch {
      return void 0;
    }
  }
  return void 0;
}
__name(ToUri, "ToUri");
function RelativePath(From, To) {
  const FromUri = ToUri(From);
  const ToUriValue = ToUri(To);
  if (!FromUri || !ToUriValue) return void 0;
  return StockRelativePath(FromUri, ToUriValue);
}
__name(RelativePath, "RelativePath");
function IsEqualOrParent(Resource, Candidate) {
  const R = ToUri(Resource);
  const C = ToUri(Candidate);
  if (!R || !C) return false;
  return StockIsEqualOrParent(R, C);
}
__name(IsEqualOrParent, "IsEqualOrParent");
function Basename(Resource) {
  const U = ToUri(Resource);
  return U ? StockBasename(U) : "";
}
__name(Basename, "Basename");
function Dirname(Resource) {
  const U = ToUri(Resource);
  return U ? StockDirname(U) : void 0;
}
__name(Dirname, "Dirname");
function Extname(Resource) {
  const U = ToUri(Resource);
  return U ? StockExtname(U) : "";
}
__name(Extname, "Extname");
function JoinPath(Resource, ...Parts) {
  const U = ToUri(Resource);
  return U ? StockJoinPath(U, ...Parts) : void 0;
}
__name(JoinPath, "JoinPath");
function GlobMatch(Pattern, Path) {
  return StockGlobMatch(Pattern, Path);
}
__name(GlobMatch, "GlobMatch");
function GlobParsePattern(Pattern) {
  return StockGlobParse(Pattern);
}
__name(GlobParsePattern, "GlobParsePattern");
function GlobIsEmpty(Pattern) {
  return StockGlobIsEmpty(Pattern);
}
__name(GlobIsEmpty, "GlobIsEmpty");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Helpers.ts
var EventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Listener) => {
  Context.WorkspaceEventEmitter.on(EventName, Listener);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.WorkspaceEventEmitter.removeListener(
        EventName,
        Listener
      );
    }, "dispose")
  };
}, "EventSubscriber");
var Call = /* @__PURE__ */ __name(async (Context, Method, Parameters) => {
  try {
    return await Context.MountainClient?.sendRequest(
      Method,
      Parameters
    );
  } catch {
    return void 0;
  }
}, "Call");
var DefaultExcludeSegments = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  ".astro",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".pnpm",
  "Target",
  "target",
  "dist",
  "out",
  "build",
  ".DS_Store"
]);
var ExtractGlobPattern = /* @__PURE__ */ __name((Raw) => {
  if (typeof Raw === "string" && Raw.length > 0) return Raw;
  if (Raw && typeof Raw === "object") {
    const Obj = Raw;
    if (typeof Obj["pattern"] === "string") return Obj["pattern"];
    if (typeof Obj["glob"] === "string") return Obj["glob"];
  }
  return void 0;
}, "ExtractGlobPattern");
var FolderToFsPath = /* @__PURE__ */ __name((FolderUri) => {
  const Raw = typeof FolderUri === "string" ? FolderUri : FolderUri?.["fsPath"] ?? FolderUri?.["path"] ?? FolderUri?.["external"];
  if (typeof Raw !== "string" || Raw.length === 0) return void 0;
  if (Raw.startsWith("file:")) {
    try {
      return decodeURIComponent(new URL(Raw).pathname);
    } catch {
      return Raw.replace(/^file:\/\//, "");
    }
  }
  return Raw;
}, "FolderToFsPath");
var ResolveWorkspaceFolders = /* @__PURE__ */ __name((Context) => {
  const InitWorkspace = Context.ExtensionHostInitData?.workspace ?? Context.ExtensionHostInitData?.workspaceData ?? {};
  return (InitWorkspace.folders ?? []).map(
    (Folder) => {
      const FsPath = FolderToFsPath(Folder?.uri);
      const Record = { ...Folder };
      if (typeof FsPath === "string") Record.FsPath = FsPath;
      return Record;
    }
  );
}, "ResolveWorkspaceFolders");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Files.ts
function CompileGlob(Pattern) {
  try {
    const Parsed = GlobParsePattern(Pattern);
    if (typeof Parsed === "function") return Parsed;
  } catch {
  }
  try {
    const Regex = Regex_default(Pattern);
    return (Path) => Regex.test(Path);
  } catch {
    return void 0;
  }
}
__name(CompileGlob, "CompileGlob");
var FindFilesLocal = /* @__PURE__ */ __name(async (_Context, Folders, Include, Exclude, MaxResults) => {
  const IncludePattern = ExtractGlobPattern(Include);
  const ExcludePattern = ExtractGlobPattern(Exclude);
  const Cap = typeof MaxResults === "number" && MaxResults > 0 ? MaxResults : 1e4;
  if (process.env["Trace"]?.includes("wsns"))
    process.stdout.write(
      `[LandFix:WsNs] findFiles include=${IncludePattern ?? "<any>"} exclude=${ExcludePattern ?? "<none>"} cap=${Cap} folders=${Folders.length}
`
    );
  if (!IncludePattern) {
    if (process.env["Trace"]?.includes("wsns"))
      process.stdout.write(
        "[LandFix:WsNs] findFiles: no include pattern \u2192 []\n"
      );
    return [];
  }
  const IncludeMatcher = CompileGlob(IncludePattern);
  if (!IncludeMatcher) {
    if (process.env["Trace"]?.includes("wsns"))
      process.stdout.write(
        `[LandFix:WsNs] findFiles: glob compile failed for ${IncludePattern} (both stock + fallback)
`
      );
    return [];
  }
  const ExcludeMatcher = ExcludePattern ? CompileGlob(ExcludePattern) : void 0;
  const { readdir } = await import("node:fs/promises");
  const { join, relative, sep } = await import("node:path");
  const Results = [];
  const MaxDepth = 32;
  const DeadlineAt = Date.now() + 3e4;
  let Truncated = "";
  const Walk = /* @__PURE__ */ __name(async (Root, Current, Depth) => {
    if (Results.length >= Cap) {
      Truncated = "cap";
      return;
    }
    if (Depth > MaxDepth) {
      Truncated = Truncated || "depth";
      return;
    }
    if (Date.now() > DeadlineAt) {
      Truncated = Truncated || "deadline";
      return;
    }
    let Entries;
    try {
      Entries = await readdir(Current, {
        withFileTypes: true
      });
    } catch {
      return;
    }
    const SubDirectories = [];
    for (const Entry of Entries) {
      if (Results.length >= Cap) {
        Truncated = "cap";
        return;
      }
      const Name = Entry.name;
      if (DefaultExcludeSegments.has(Name)) continue;
      if (typeof Entry.isSymbolicLink === "function" && Entry.isSymbolicLink())
        continue;
      const Full = join(Current, Name);
      const RelativeFromRoot = relative(Root, Full).split(sep).join("/");
      if (Entry.isDirectory()) {
        SubDirectories.push(Full);
        continue;
      }
      if (ExcludeMatcher && ExcludeMatcher(RelativeFromRoot)) continue;
      if (!IncludeMatcher(RelativeFromRoot)) continue;
      Results.push(URI.file(Full));
    }
    const Concurrency = 4;
    for (let Index = 0; Index < SubDirectories.length; Index += Concurrency) {
      const Batch = SubDirectories.slice(Index, Index + Concurrency);
      await Promise.all(Batch.map((Sub) => Walk(Root, Sub, Depth + 1)));
      if (Results.length >= Cap) {
        Truncated = "cap";
        return;
      }
      if (Date.now() > DeadlineAt) {
        Truncated = Truncated || "deadline";
        return;
      }
    }
  }, "Walk");
  for (const Folder of Folders) {
    const FsPath = FolderToFsPath(Folder?.uri);
    if (!FsPath) {
      if (process.env["Trace"]?.includes("wsns"))
        process.stdout.write(
          `[LandFix:WsNs] findFiles: folder has no fsPath (name=${Folder?.name})
`
        );
      continue;
    }
    await Walk(FsPath, FsPath, 0);
  }
  if (Truncated) {
    if (process.env["Trace"]?.includes("wsns"))
      process.stdout.write(
        `[LandFix:WsNs] findFiles: truncated (${Truncated}) at ${Results.length} result(s)
`
      );
  }
  if (process.env["Trace"]?.includes("wsns"))
    process.stdout.write(
      `[LandFix:WsNs] findFiles: matched ${Results.length} file(s) for include=${IncludePattern}
`
    );
  return Results;
}, "FindFilesLocal");

// Source/Services/Handler/VscodeAPI/Workspace/Namespace/Find/Text/In/Files/Fallback.ts
import { promises as FsPromises } from "node:fs";
var ExtractPattern = /* @__PURE__ */ __name((Query) => {
  if (Query == null) return void 0;
  const Q = typeof Query === "string" ? { pattern: Query } : Query;
  if (!Q.pattern) return void 0;
  const Flags = `gm${Q.isCaseSensitive ? "" : "i"}`;
  let Source = Q.pattern;
  if (!Q.isRegExp) {
    Source = Source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (Q.isWordMatch) {
    Source = `\\b${Source}\\b`;
  }
  try {
    return new RegExp(Source, Flags);
  } catch {
    return void 0;
  }
}, "ExtractPattern");
var ToFsPath = /* @__PURE__ */ __name((Uri) => {
  if (Uri == null) return void 0;
  if (typeof Uri === "string") {
    return Uri.startsWith("file://") ? Uri.slice("file://".length) : Uri;
  }
  const U = Uri;
  return U.fsPath ?? U.path;
}, "ToFsPath");
async function FindTextInFilesNodeFallback(Context, Folders, Query, Options, Callback) {
  const Pattern = ExtractPattern(Query);
  if (!Pattern) return { limitHit: false };
  const Opts = Options ?? {};
  const Max = typeof Opts.maxResults === "number" ? Opts.maxResults : 1e4;
  const Encoding = Opts.encoding ?? "utf8";
  const Candidates = await FindFilesLocal(
    Context,
    Folders,
    Opts.include ?? "**/*",
    Opts.exclude,
    // Don't let the file-enumeration phase cap us below the match cap.
    Math.max(Max * 4, 1e4)
  );
  let Emitted = 0;
  for (const Candidate of Candidates) {
    if (Emitted >= Max) return { limitHit: true };
    const Path = ToFsPath(Candidate);
    if (!Path) continue;
    let Content;
    try {
      Content = await FsPromises.readFile(Path, Encoding);
    } catch {
      continue;
    }
    if (Content.length > 0 && Content.indexOf("\0") !== -1) continue;
    const Lines = Content.split("\n");
    for (let LineNumber = 0; LineNumber < Lines.length; LineNumber++) {
      const Line = Lines[LineNumber];
      Pattern.lastIndex = 0;
      const Ranges = [];
      let M;
      while ((M = Pattern.exec(Line)) !== null) {
        Ranges.push({
          start: { line: LineNumber, character: M.index },
          end: {
            line: LineNumber,
            character: M.index + M[0].length
          }
        });
        if (M[0].length === 0) Pattern.lastIndex++;
      }
      if (Ranges.length === 0) continue;
      const Match = {
        uri: Candidate,
        ranges: Ranges,
        preview: {
          text: Line,
          matches: Ranges.map((R) => ({
            start: { line: 0, character: R.start.character },
            end: { line: 0, character: R.end.character }
          }))
        }
      };
      if (Callback) {
        try {
          Callback(Match);
        } catch {
        }
      }
      Emitted += Ranges.length;
      if (Emitted >= Max) return { limitHit: true };
    }
  }
  return { limitHit: false };
}
__name(FindTextInFilesNodeFallback, "FindTextInFilesNodeFallback");
export {
  FindTextInFilesNodeFallback
};
//# sourceMappingURL=Fallback.js.map
