var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Debug/Server.ts
import * as Http from "node:http";
function ParseMode() {
  const Raw = (process.env.DebugServer ?? "").trim().toLowerCase();
  if (Raw === "" || Raw === "0" || Raw === "false" || Raw === "off" || Raw === "no") return "off";
  if (Raw === "mountain" || Raw === "m" || Raw === "native" || Raw === "rust")
    return "mountain";
  if (Raw === "cocoon" || Raw === "c" || Raw === "eh" || Raw === "extension-host" || Raw === "node") return "cocoon";
  if (Raw === "both" || Raw === "all" || Raw === "dual") return "both";
  if (Raw === "1" || Raw === "true" || Raw === "on" || Raw === "yes")
    return "mountain";
  return "off";
}
__name(ParseMode, "ParseMode");
function CocoonEnabled(M) {
  return M === "cocoon" || M === "both";
}
__name(CocoonEnabled, "CocoonEnabled");
function MountainPort() {
  const V = process.env.DebugServerPortMountain ?? process.env.DebugServerPort;
  const N = V ? Number.parseInt(V, 10) : Number.NaN;
  return Number.isFinite(N) ? N : 9933;
}
__name(MountainPort, "MountainPort");
function CocoonPort() {
  const V = process.env.DebugServerPortCocoon;
  const N = V ? Number.parseInt(V, 10) : Number.NaN;
  return Number.isFinite(N) ? N : 9934;
}
__name(CocoonPort, "CocoonPort");
var ServerInstance = null;
var Hooks = {};
function RegisterHooks(Next) {
  Hooks = { ...Hooks, ...Next };
}
__name(RegisterHooks, "RegisterHooks");
function Start() {
  if (ServerInstance) return CocoonPort();
  const Mode = ParseMode();
  if (!CocoonEnabled(Mode)) return null;
  const Port = CocoonPort();
  const Server = Http.createServer((Req, Res) => {
    HandleRequest(Req, Res).catch((Err) => {
      try {
        Res.statusCode = 500;
        Res.setHeader("content-type", "application/json");
        Res.end(JSON.stringify({ error: String(Err?.stack ?? Err) }));
      } catch {
      }
    });
  });
  Server.on("error", (Err) => {
    process.stderr.write(
      `[CocoonDebug] listener error on ${Port}: ${Err.code ?? Err.message}
`
    );
  });
  Server.listen(Port, "127.0.0.1", () => {
    process.stderr.write(
      `[CocoonDebug] Cocoon layer listening on http://127.0.0.1:${Port} (mode=${Mode})
`
    );
  });
  ServerInstance = Server;
  return Port;
}
__name(Start, "Start");
function Stop() {
  if (!ServerInstance) return;
  try {
    ServerInstance.close();
  } catch {
  }
  ServerInstance = null;
}
__name(Stop, "Stop");
async function ReadJsonBody(Req) {
  const Chunks = [];
  for await (const C of Req) Chunks.push(C);
  if (Chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(Chunks).toString("utf8"));
  } catch {
    return {};
  }
}
__name(ReadJsonBody, "ReadJsonBody");
function SendJson(Res, Status, Body) {
  const Text = JSON.stringify(Body);
  Res.statusCode = Status;
  Res.setHeader("content-type", "application/json");
  Res.setHeader("content-length", Buffer.byteLength(Text).toString());
  Res.end(Text);
}
__name(SendJson, "SendJson");
async function HandleRequest(Req, Res) {
  const Url = new URL(Req.url ?? "/", "http://127.0.0.1");
  const Path = Url.pathname;
  const Method = (Req.method ?? "GET").toUpperCase();
  if (Method === "GET" && Path === "/health") {
    return SendJson(Res, 200, {
      layer: "cocoon",
      pid: process.pid,
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      mode: ParseMode(),
      capabilities: [
        "health",
        "layers",
        "execute",
        "extensions",
        "commands",
        "command",
        "processes"
      ]
    });
  }
  if (Method === "GET" && Path === "/layers") {
    return SendJson(Res, 200, {
      mountain: { enabled: ParseMode() !== "cocoon" && ParseMode() !== "off", port: MountainPort() },
      cocoon: { enabled: CocoonEnabled(ParseMode()), port: CocoonPort() },
      mode: ParseMode()
    });
  }
  if (Method === "POST" && Path === "/execute") {
    const Body = await ReadJsonBody(Req);
    const Js = String(Body.js ?? "");
    if (!Js) return SendJson(Res, 400, { error: "missing js" });
    const Target = Body.target ?? "extension-host";
    if (Target !== "extension-host" && Target !== "eh" && Target !== "cocoon")
      return SendJson(Res, 400, { error: `unsupported target: ${Target}` });
    try {
      const Result = await (0, eval)(Js);
      return SendJson(Res, 200, {
        ok: true,
        result: SafeSerialize(Result)
      });
    } catch (Err) {
      return SendJson(Res, 500, { ok: false, error: String(Err?.stack ?? Err) });
    }
  }
  if (Method === "GET" && Path === "/extensions") {
    try {
      const Ids = Hooks.ListExtensions?.() ?? [];
      return SendJson(Res, 200, { extensions: Ids, source: Hooks.ListExtensions ? "hook" : "unavailable" });
    } catch (Err) {
      return SendJson(Res, 500, { error: String(Err?.message ?? Err) });
    }
  }
  if (Method === "GET" && Path === "/commands") {
    try {
      const Ids = Hooks.ListCommands?.() ?? [];
      return SendJson(Res, 200, { commands: Ids, source: Hooks.ListCommands ? "hook" : "unavailable" });
    } catch (Err) {
      return SendJson(Res, 500, { error: String(Err?.message ?? Err) });
    }
  }
  if (Method === "POST" && Path === "/command") {
    const Body = await ReadJsonBody(Req);
    const Id = String(Body.id ?? "");
    const Args = Array.isArray(Body.args) ? Body.args : [];
    if (!Id) return SendJson(Res, 400, { error: "missing id" });
    if (!Hooks.ExecuteCommand)
      return SendJson(Res, 503, { error: "ExecuteCommand hook not registered" });
    try {
      const Result = await Hooks.ExecuteCommand(Id, Args);
      return SendJson(Res, 200, { ok: true, result: SafeSerialize(Result) });
    } catch (Err) {
      return SendJson(Res, 500, { ok: false, error: String(Err?.stack ?? Err) });
    }
  }
  if (Method === "GET" && Path === "/processes") {
    const Mem = process.memoryUsage();
    return SendJson(Res, 200, {
      pid: process.pid,
      ppid: process.ppid,
      uptimeSeconds: Math.round(process.uptime()),
      rssMb: Math.round(Mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(Mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(Mem.heapTotal / 1024 / 1024),
      arch: process.arch,
      platform: process.platform
    });
  }
  SendJson(Res, 404, { error: "not found", method: Method, path: Path });
}
__name(HandleRequest, "HandleRequest");
function SafeSerialize(V) {
  if (V === void 0) return null;
  try {
    JSON.stringify(V);
    return V;
  } catch {
    return String(V);
  }
}
__name(SafeSerialize, "SafeSerialize");
export {
  RegisterHooks,
  Start,
  Stop
};
//# sourceMappingURL=Server.js.map
