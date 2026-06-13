/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/LanguageActivation
 * @description
 * Maps file URIs to VS Code language identifiers and fires the matching
 * `onLanguage:<id>` activation event so language-gated extensions
 * activate when a user opens a document with that language. Mirrors
 * stock VS Code's `ExtensionService.activateByEvent("onLanguage:X")`
 * path. Activation is fire-and-forget - the opener doesn't block on
 * extension bootstrap.
 */

import { CocoonDevLog } from "../../../../../Dev/Log.js";

import type { HandlerContext } from "../../../../Handler/Context.js";

// The map is kept tight around the languages VS Code ships with +
// the ones the user's current extensions contribute. Extensions can
// declare additional `contributes.languages[].extensions` in their
// manifest; those flow in via `ResolveLanguageIdFromRegistry` below
// so the core table stays small and readable.
const STATIC_EXTENSION_TO_LANGUAGE: Record<string, string> = {

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

	dart: "dart",
};

/**
 * Look up the language contributed by any loaded extension whose
 * `contributes.languages[].extensions` includes the supplied file
 * extension. Allows community-contributed languages (eg. Svelte,
 * Astro, Prisma) to surface even when the static table above has
 * drifted behind upstream.
 */
function ResolveLanguageIdFromRegistry(
	Context: HandlerContext,

	FileExtension: string,
): string | undefined {

	const ExtensionWithDot = `.${FileExtension}`;

	for (const Description of Context.ExtensionRegistry.values()) {
		const Contributes = (Description as { contributes?: unknown })

			?.contributes as
			| {
					languages?: Array<{
						id?: string;

						extensions?: string[];

						filenames?: string[];
					}>;
			  }

			| undefined;

		const Languages = Contributes?.languages;

		if (!Languages) continue;

		for (const Language of Languages) {
			if (!Language?.id) continue;

			if (Language.extensions?.includes(ExtensionWithDot)) {
				return Language.id;
			}
		}
	}

	return undefined;
}

/**
 * Map a URI string (or `file:` path) to a VS Code language identifier.
 * Returns `plaintext` when nothing matches.
 */
export function DeriveLanguageIdFromUri(UriString: string): string {

	if (!UriString) return "plaintext";

	// Strip scheme + query + hash so we're left with the path.
	let Path = UriString;

	const SchemeEnd = Path.indexOf("://");

	if (SchemeEnd !== -1) Path = Path.slice(SchemeEnd + 3);

	const QueryStart = Path.indexOf("?");

	if (QueryStart !== -1) Path = Path.slice(0, QueryStart);

	const HashStart = Path.indexOf("#");

	if (HashStart !== -1) Path = Path.slice(0, HashStart);

	// Exact-filename fast path (Dockerfile, Makefile, CMakeLists.txt).
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

/**
 * Fire-and-forget `$activateByEvent("onLanguage:<id>")` dispatch.
 * Guarded so repeat calls for the same language inside one session
 * don't re-trigger the ActivationEventIndex walk - the first call
 * marks the language as "already fired"; matching extensions stay
 * activated for the rest of the session.
 */
const FiredLanguages = new Set<string>();

export function FireOnLanguageActivation(
	Context: HandlerContext,

	LanguageId: string,
): void {
	if (!LanguageId || LanguageId === "plaintext") return;

	if (FiredLanguages.has(LanguageId)) return;

	FiredLanguages.add(LanguageId);

	const Event = `onLanguage:${LanguageId}`;

	// `HandleActivateByEvent` lives one directory up in
	// ExtensionHostHandler.ts; call it indirectly via the request
	// router so we don't introduce a circular import.
	const Router = (
		Context as { ActivateByEvent?: (E: string) => Promise<void> }
	).ActivateByEvent;

	if (typeof Router === "function") {
		Router(Event).catch((Error: unknown) => {
			const Message =
				Error instanceof globalThis.Error
					? Error.message
					: String(Error;

			CocoonDevLog(
				"language-activation",

				`[LanguageActivation] onLanguage:${LanguageId} failed: ${Message}`,
			;
		};

		return;
	}

	// Fallback: walk the ActivationEventIndex directly. `HandleActivateByEvent`
	// does this under the hood; if the context didn't expose the
	// router, do a minimal index lookup and gate on CocoonDevLog.
	const Matching = Context.ActivationEventIndex?.get(Event) ?? [];

	if (Matching.length > 0) {
		CocoonDevLog(
			"language-activation",

			`[LanguageActivation] ${Event} matches ${Matching.length} extension(s); activate router is absent - extensions will activate on their next event instead`,
		;
	}
}
