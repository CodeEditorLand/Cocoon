var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IMountainClientService.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/TerminalService.ts
import { Effect as Effect2, Layer, Context } from "effect";
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
    console.log(`[Terminal] Creating terminal: ${name}`);
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
    await this.mountainClient.sendRequest("terminal.write", {
      id: terminalId,
      data: text
    });
  }
  async resize(terminalId, cols, rows) {
    console.log(`[Terminal] Resize ${terminalId} to ${cols}x${rows}`);
  }
  async kill(terminalId) {
    console.log(`[Terminal] Kill ${terminalId}`);
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
//# sourceMappingURL=TerminalService.js.map
