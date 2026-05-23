var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/I/Mountain/Client/Service.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/Dev/Log.ts
var Raw = process.env["Trace"] ?? "";
var ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
var TagSet = new Set(ParsedTags);
var IsShort = TagSet.has("short");
var HasAll = TagSet.has("all");
var IsEnabled = /* @__PURE__ */ __name((Tag) => {
  if (TagSet.size === 0) return false;
  if (HasAll || IsShort) return true;
  return TagSet.has(Tag.toLowerCase());
}, "IsEnabled");
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog;

// Source/Services/Terminal/Service.ts
import { Context, Effect as Effect2, Layer } from "effect";
var ITerminalService = Context.Tag("ITerminalService")();
var TerminalService = class {
  constructor(mountainClient) {
    this.mountainClient = mountainClient;
  }
  mountainClient;
  static {
    __name(this, "TerminalService");
  }
  async createTerminal(name, shellPath, cwd) {
    CocoonDevLog("service", `[Terminal] Creating terminal: ${name}`);
    const terminalId = await this.mountainClient.sendRequest(
      "terminal.create",
      {
        name,
        shell_path: shellPath,
        cwd
      }
    );
    return terminalId;
  }
  async sendText(terminalId, text) {
    await this.mountainClient.sendRequest("$terminal:sendText", {
      id: terminalId,
      data: text
    });
  }
  async resize(terminalId, cols, rows) {
    CocoonDevLog(
      "service",
      `[Terminal] Resize ${terminalId} to ${cols}x${rows}`
    );
  }
  async kill(terminalId) {
    CocoonDevLog("service", `[Terminal] Kill ${terminalId}`);
  }
};
var TerminalServiceLayer = Layer.effect(
  ITerminalService,
  Effect2.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    return new TerminalService(mountainClient);
  })
);
export {
  ITerminalService,
  TerminalService,
  TerminalServiceLayer
};
//# sourceMappingURL=Service.js.map
