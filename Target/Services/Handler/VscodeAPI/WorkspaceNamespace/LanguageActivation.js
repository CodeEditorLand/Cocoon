var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/LanguageActivation.ts
var STATIC_EXTENSION_TO_LANGUAGE = {
  // Web / script
  ts: "typescript",
  tsx: "typescriptreact",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascriptreact",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "jsonc",
  "json5": "json",
  // Markup / styles
  html: "html",
  htm: "html",
  xml: "xml",
  xhtml: "xml",
  svg: "xml",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  // Systems
  rs: "rust",
  go: "go",
  c: "c",
  h: "c",
  hh: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  cs: "csharp",
  // Scripting
  py: "python",
  pyi: "python",
  rb: "ruby",
  php: "php",
  lua: "lua",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  java: "java",
  scala: "scala",
  // Shell / ops
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "shellscript",
  ps1: "powershell",
  dockerfile: "dockerfile",
  // Data / config
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  properties: "properties",
  // Frontend frameworks
  svelte: "svelte",
  vue: "vue",
  astro: "astro",
  // Others
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  proto: "proto3",
  tex: "latex",
  r: "r",
  dart: "dart"
};
function ResolveLanguageIdFromRegistry(Context, FileExtension) {
  const ExtensionWithDot = `.${FileExtension}`;
  for (const Description of Context.ExtensionRegistry.values()) {
    const Contributes = Description?.contributes;
    const Languages = Contributes?.languages;
    if (!Languages) continue;
    for (const Language of Languages) {
      if (!Language?.id) continue;
      if (Language.extensions?.includes(ExtensionWithDot)) {
        return Language.id;
      }
    }
  }
  return void 0;
}
__name(ResolveLanguageIdFromRegistry, "ResolveLanguageIdFromRegistry");
function DeriveLanguageIdFromUri(UriString) {
  if (!UriString) return "plaintext";
  let Path = UriString;
  const SchemeEnd = Path.indexOf("://");
  if (SchemeEnd !== -1) Path = Path.slice(SchemeEnd + 3);
  const QueryStart = Path.indexOf("?");
  if (QueryStart !== -1) Path = Path.slice(0, QueryStart);
  const HashStart = Path.indexOf("#");
  if (HashStart !== -1) Path = Path.slice(0, HashStart);
  const LastSlash = Math.max(Path.lastIndexOf("/"), Path.lastIndexOf("\\"));
  const FileName = LastSlash === -1 ? Path : Path.slice(LastSlash + 1);
  const Lower = FileName.toLowerCase();
  switch (Lower) {
    case "dockerfile":
    case "dockerfile.dev":
    case "dockerfile.prod":
      return "dockerfile";
    case "makefile":
    case "gnumakefile":
      return "makefile";
    case "cmakelists.txt":
      return "cmake";
    case ".gitignore":
    case ".dockerignore":
      return "ignore";
    case ".gitattributes":
      return "properties";
  }
  const Dot = FileName.lastIndexOf(".");
  if (Dot === -1 || Dot === FileName.length - 1) return "plaintext";
  const Extension = FileName.slice(Dot + 1).toLowerCase();
  return STATIC_EXTENSION_TO_LANGUAGE[Extension] ?? "plaintext";
}
__name(DeriveLanguageIdFromUri, "DeriveLanguageIdFromUri");
var FiredLanguages = /* @__PURE__ */ new Set();
function FireOnLanguageActivation(Context, LanguageId) {
  if (!LanguageId || LanguageId === "plaintext") return;
  if (FiredLanguages.has(LanguageId)) return;
  FiredLanguages.add(LanguageId);
  const Event = `onLanguage:${LanguageId}`;
  const Router = Context.ActivateByEvent;
  if (typeof Router === "function") {
    Router(Event).catch((Error2) => {
      const Message = Error2 instanceof globalThis.Error ? Error2.message : String(Error2);
      console.warn(
        `[LanguageActivation] onLanguage:${LanguageId} failed: ${Message}`
      );
    });
    return;
  }
  const Matching = Context.ActivationEventIndex?.get(Event) ?? [];
  if (Matching.length > 0) {
    console.log(
      `[LanguageActivation] ${Event} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`
    );
  }
}
__name(FireOnLanguageActivation, "FireOnLanguageActivation");
export {
  DeriveLanguageIdFromUri,
  FireOnLanguageActivation
};
//# sourceMappingURL=LanguageActivation.js.map
