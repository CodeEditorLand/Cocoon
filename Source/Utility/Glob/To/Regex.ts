/**
 * @module Utility/GlobToRegex
 * @description
 * Convert a VS Code glob string to an anchored `RegExp`. Shared by the
 * `workspace.findFiles` file walker and the `languages.match` document
 * selector so both layers agree on pattern semantics.
 *
 * Supported constructs:
 *
 * | Pattern                         | Meaning                                   |
 * | ------------------------------- | ----------------------------------------- |
 * | `**`                            | Any run of characters including `/`       |
 * | `*`                             | Any run of non-`/` characters             |
 * | `?`                             | Any single non-`/` character              |
 * | `[abc]` `[!abc]` `[a-z]`        | POSIX-ish character class                 |
 * | `{a,b,c}`                       | Brace alternation (nests)                 |
 * | `{1..10}` `{01..09}` `{1..5..2}`| Numeric range (optional zero-pad, step)   |
 * | `?(p)` `*(p)` `+(p)` `@(p)`     | Extglob: 0-1, 0-*, 1-*, exactly-one of p  |
 * | `!(p)`                          | Bounded negation - one-or-more non-`/`    |
 * |                                 | chars that together don't match `p`       |
 * | `\` + any char                  | Escape (treat char as literal)            |
 *
 * The resulting regex is always anchored with `^…$`. Unknown constructs fall
 * through as literal characters so a stricter pattern simply matches nothing
 * instead of throwing.
 */

/**
 * Find the position of the matching closing brace for an opening brace at
 * `Start`, respecting nesting and escaped characters. Returns -1 on no match.
 */
const FindMatchingBrace = (
	Input: string,

	Start: number,

	Open: string,

	Close: string,
): number => {

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
};

/**
 * Split a comma-separated brace body into top-level alternatives, respecting
 * nested `{...}` and `(...)`. `"a,{b,c},d"` → `["a", "{b,c}", "d"]`.
 */
const SplitTopLevelCommas = (Body: string): string[] => {

	const Parts: string[] = [];

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
			Parts.push(Body.slice(Start, I);

			Start = I + 1;
		}
	}

	Parts.push(Body.slice(Start);

	return Parts;
};

/**
 * Expand brace patterns `{a,b,c}` and numeric ranges `{1..10}` / `{01..09}`
 * (zero-padding preserved) into the full cartesian product of literal
 * alternatives. Nested braces recurse; unmatched opening braces pass through
 * as literal `{`.
 */
const ExpandBraces = (Input: string): string[] => {
	const Open = Input.indexOf("{";

	if (Open === -1) return [Input];

	const Close = FindMatchingBrace(Input, Open, "{", "}";

	if (Close === -1) return [Input];

	const Prefix = Input.slice(0, Open;

	const Body = Input.slice(Open + 1, Close;

	const Suffix = Input.slice(Close + 1;

	const RangeMatch = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(Body;

	const Alternatives: string[] = [];

	if (RangeMatch) {
		const Start = parseInt(RangeMatch[1]!, 10;

		const End = parseInt(RangeMatch[2]!, 10;

		const StepRaw = RangeMatch[3];

		const Step = StepRaw ? Math.abs(parseInt(StepRaw, 10)) : 1;

		if (Step > 0 && Number.isFinite(Start) && Number.isFinite(End)) {
			const Width =
				RangeMatch[1]!.startsWith("0") || RangeMatch[2]!.startsWith("0")

					? Math.max(RangeMatch[1]!.length, RangeMatch[2]!.length)

					: 0;

			const Direction = Start <= End ? 1 : -1;

			for (
				let Value = Start;
				Direction === 1 ? Value <= End : Value >= End;
				Value += Direction * Step
			) {
				const Text = String(Math.abs(Value);

				const Padded =
					Width > 0 && Text.length < Width
						? "0".repeat(Width - Text.length) + Text
						: Text;

				Alternatives.push(Value < 0 ? `-${Padded}` : Padded;
			}
		}
	}

	if (Alternatives.length === 0) {
		Alternatives.push(...SplitTopLevelCommas(Body);
	}

	const Expanded: string[] = [];

	for (const Alternative of Alternatives) {
		for (const Sub of ExpandBraces(Alternative)) {
			for (const Tail of ExpandBraces(Suffix)) {
				Expanded.push(`${Prefix}${Sub}${Tail}`;
			}
		}
	}

	return Expanded;
};

const RegexEscape = (Character: string): string =>
	/[.+^$()|\[\]\\]/.test(Character) ? `\\${Character}` : Character;

/**
 * Translate one brace-expanded glob (no top-level braces) plus its extglob
 * operators to a regex source. `**` matches any run of characters including
 * `/`; `*` matches any run of non-`/`; `?` matches any single non-`/`.
 *
 * `!(pat1|pat2)` uses a bounded negative lookahead - typical idioms like
 * `!(node_modules)` resolve to "any path segment that is not `node_modules`".
 */
const PlainGlobToRegexSource = (Glob: string): string => {
	let Expression = "";

	let I = 0;

	while (I < Glob.length) {
		const Character = Glob[I]!;

		const Next = Glob[I + 1];

		if (Character === "*" && Next === "*") {
			Expression += ".*";

			I += 2;

			if (Glob[I] === "/") I++;

			continue;
		}

		if (
			(Character === "?" ||
				Character === "*" ||
				Character === "+" ||
				Character === "@" ||
				Character === "!") &&
			Next === "("
		) {
			const CloseAt = FindMatchingBrace(Glob, I + 1, "(", ")";

			if (CloseAt !== -1) {
				const Inside = Glob.slice(I + 2, CloseAt;

				const Alternatives = SplitTopLevelCommas(
					Inside.replace(/\|/g, ","),
				).map((Alternative) => PlainGlobToRegexSource(Alternative);

				const Joined = Alternatives.join("|";

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
			const CloseAt = Glob.indexOf("]", I + 1;

			if (CloseAt !== -1) {
				let Class = Glob.slice(I + 1, CloseAt;

				if (Class.startsWith("!")) Class = `^${Class.slice(1)}`;

				Expression += `[${Class}]`;

				I = CloseAt + 1;

				continue;
			}
		}

		if (Character === "\\" && Next !== undefined) {
			Expression += RegexEscape(Next;

			I += 2;

			continue;
		}

		Expression += RegexEscape(Character;

		I++;
	}

	return Expression;
};

const GlobToRegex = (Glob: string): RegExp => {
	const Variants = ExpandBraces(Glob;

	const Source =
		Variants.length === 1
			? PlainGlobToRegexSource(Variants[0]!)
			: `(?:${Variants.map(PlainGlobToRegexSource).join("|")})`;

	return new RegExp(`^${Source}$`;
};

export default GlobToRegex;
