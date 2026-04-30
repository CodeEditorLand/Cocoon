var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/GlobToRegex.ts
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
var GlobToRegex_default = GlobToRegex;
export {
  GlobToRegex_default as default
};
//# sourceMappingURL=GlobToRegex.js.map
