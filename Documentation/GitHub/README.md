# Cocoon - TypeScript Runtime Element

Cocoon is the TypeScript runtime environment for CodeEditorLand, providing
Node.js module interception and filesystem/process shimming.

Refer to the [Architecture.md](./Architecture.md) for detailed layer diagrams
and component maps.

This document is the internal architecture reference for the Element. It walks
the twenty-one top-level subsystems under
[Source](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source), the
boundaries between them, and the reasoning that put each boundary where it is.

Cocoon is the Node.js extension host of the Land editor. Mountain (Rust) owns
state and policy; Cocoon owns the `vscode` API surface that extensions actually
import. Every call an extension makes is translated here and sent across gRPC.

> [!NOTE]
>
> Mountain is the source of truth for policy and state - Cocoon enforces and
> translates, it does not decide.

---

## Shim Compatibility

| 🟠 Low-Level Shim             | 🔵 Coverage Shim                |
| ----------------------------- | ------------------------------- |
| Tier: `TierShim=Own\|Preempt` | Tier: `TierShim=Proxy\|Replace` |
| Engine prototype hooks        | Service routing + audit         |

> This Element supports the Land deep-shim interception system. Gated behind
> `TierShim` env var (default: `None` - zero overhead).

### The full interception ladder&#x2001;🪜

The two columns above are the shipped presets. The
[Shim](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim)
subsystem actually defines five ordered levels, and the preset table names four
of them; `None` is the default and the fifth.

| Level      | Behaviour                                             |
| ---------- | ----------------------------------------------------- |
| `None`     | No interception - the module is tree-shaken entirely  |
| `Proxy`    | Audit-only: hooks installed, nothing redirected       |
| `Replace`  | `fs` and `child_process` redirect to Mountain         |
| `Own`      | Full Land ownership of `fs` and `child_process`       |
| `Preempt`  | Land preempts every module load                       |

> ```ts
> // Shim/NodeModuleInterceptor.ts - resolved once, at module scope
> const TierShim: ShimLevel = ((typeof __LandTier_Shim__ === "string" &&
> __LandTier_Shim__.length > 0 ? __LandTier_Shim__
>     : process.env["TierShim"]) || "None") as ShimLevel;
> ```

> [!NOTE]
>
> The level is a build-time constant in shipped bundles, which is why `None`
> costs nothing at runtime.

---

## Bootstrap and Entry&#x2001;🚀

[Bootstrap](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap)
is the first code that runs. Its ordering is load-bearing: the interceptor must
patch `Module._load` before any extension can observe an unpatched `fs`.

-   **Implementation** -
    [Bootstrap/Implementation/Cocoon/Main.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/Implementation/Cocoon/Main.ts)
    is the process entry. It installs the interceptor, then imports Tier, then
    the Debug server, then runs the Effect bootstrap. **Main** is a single
    ordered prelude, deliberately not a module graph.
-   **WebSocket** -
    [Bootstrap/WebSocket/Server.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/WebSocket/Server.ts)
    is a JSON-RPC listener for the direct Sky-to-Cocoon transport, authenticated
    by a hex secret compared with `timingSafeEqual`.

> ```ts
> // Bootstrap/Implementation/Cocoon/Main.ts - order is the contract
> import installNodeModuleInterceptor from "../../../Shim/NodeModuleInterceptor.js";
> installNodeModuleInterceptor();
> import "../../../Utility/Tier.js";
> ```

> [!IMPORTANT]
>
> The interceptor call sits above every other import because a later patch
> would miss modules an extension has already required.

---

## Process Model&#x2001;⚙️

Cocoon runs as a hardened child process. Two subsystems own that posture.

-   **PatchProcess** -
    [PatchProcess](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess)
    hardens the runtime before any extension activates, so `process.exit`,
    `process.crash` and `Module._load("natives")` hit a policy instead of raw
    Node. It splits into
    [Patcher.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Patcher.ts)
    (orchestrator),
    [Loader.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Loader.ts),
    [Security.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Security.ts),
    [Validator.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Validator.ts)
    and a **Type** converter.
-   **Platform** -
    [Platform](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform)
    abstracts the host: **OS** detection, **Environment** variable access,
    **Process** helpers, a **Logger**, an Effect **Service** layer, a **VSCode**
    type bridge and
    [FiddeeRoot.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/FiddeeRoot.ts),
    which resolves the `$HOME/.fiddee` dotfile root.

> ```ts
> // Platform/FiddeeRoot.ts - one place per language owns the dotfile root
> // ~/.fiddee/extensions, ~/.fiddee/globalStorage, ~/.fiddee/logs
> ```

> [!NOTE]
>
> `FiddeeRoot` mirrors a Rust atom in Mountain so a future rename touches
> exactly one file on each side.

---

## Transport - IPC and gRPC&#x2001;🔌

[IPC](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC) carries
every cross-process call. It follows VS Code's `vs/base/parts/ipc` shape so the
patterns are familiar, but the far end is Mountain's Vine protocol rather than
Electron.

| Module      | Path                                                                                                          | Role                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Protocol    | [IPC/Protocol.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Protocol.ts)                 | Request / response / notification contract                     |
| Channel     | [IPC/Channel.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Channel.ts)                   | Command, event, stream and sync channels                       |
| Handler     | [IPC/Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Handler.ts)                   | Registration, async dispatch, cancellation                     |
| Message     | [IPC/Message](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Message)                         | Serialize, deserialize, batch, unbatch, validate, **VSBuffer**  |
| Type        | [IPC/Type/Converter.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Type/Converter.ts)     | Wire-shape conversion                                          |

The **gRPC** server in
[Services/gRPC/Server/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/gRPC/Server/Service.ts)
implements the CocoonService side of Mountain's Vine protocol, including
bidirectional streaming for live events.

> ```ts
> // IPC/Handler.ts - a request id is a string; results carry Result<T, E>
> export type RequestId = string;
> ```

> [!NOTE]
>
> Handlers return `Result` rather than throwing, so a failed IPC call cannot
> unwind an extension's stack.

### Request routing&#x2001;🚦

[Services/Handler/Request/Routing/Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/Request/Routing/Handler.ts)
dispatches inbound Mountain requests using a regex-keyed prefix table, so a new
service prefix never edits the caller. Returning `undefined` means "unclaimed"
and the call falls through to extension-host dispatch.

> ```ts
> // Services/Handler/Request/Routing/Handler.ts
> // extension.*     -> IExtensionHostService
> // configuration.* -> IConfigurationService
> ```

> [!NOTE]
>
> The table is data, not control flow - adding a prefix is a one-line change.

---

## Service Composition&#x2001;🧩

Two directories differ by one letter and by intent, and the distinction is the
single most important thing to understand in this tree.

-   **Service** (singular) -
    [Service](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service)
    is the Effect-TS composition root. **Effect** holds the atomic services
    (**Bootstrap**, **Extension**, **Health**, **Module** interceptor,
    **Mountain** client, **RPCServer**, **Telemetry**), and
    [Service/Mapping.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts)
    is a lean singleton registry that wires the live layers together.
-   **Services** (plural) -
    [Services](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services)
    holds the implementations that back the `vscode` namespaces.

> ```ts
> // Service/Effect/index.ts - one barrel, all Effect services
> export { BootstrapTag, BootstrapLive, runBootstrap } from "./Bootstrap.js";
> ```

> [!NOTE]
>
> `Service/` decides what exists; `Services/` decides what it does.

---

## The vscode API Surface&#x2001;🪟

[Services/Handler](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler)
is the largest subsystem: it builds the `vscode` object extensions receive. Each
namespace is a factory that forwards to Mountain and subscribes to the events
Mountain pushes back.

-   **Window** -
    [Services/Window](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window)
    composes dialogs, progress, **Quick** input, **Status** bar, output
    channels, text documents and webview panels into one service.
    [Window/Dialog.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Dialog.ts)
    delegates to Mountain's `Window.ShowMessage` and resolves with the chosen
    action title or `null`.
-   **Workspace** -
    [Services/Workspace.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Workspace.ts)
    backs folders, configuration, `findFiles`, `openTextDocument` and
    `applyEdit`; its event surfaces are driven by `$accept*` notifications.
-   **Language** -
    [Services/Language/Provider/Registry.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Language/Provider/Registry.ts)
    maps numeric handles to provider objects so Mountain can invoke a provider
    it only knows by number.
-   **Terminal** -
    [Services/Terminal/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Terminal/Service.ts)
    is marked a dead wrapper; live terminal work goes through the
    `Window/CreateTerminal` handler instead.

> ```ts
> // Services/Language/Provider/Registry.ts - handles cross the wire, not objects
> // extension registers hover provider -> Handle N -> Mountain stores N
> ```

> [!WARNING]
>
> Provider objects never leave the process; only opaque numeric handles are
> sent to Mountain.

### Notifications and documents&#x2001;📨

Inbound notifications fan out through
[Services/Handler/Notification/Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/Notification/Handler.ts)
onto one of two emitters, while
[Services/Handler/Document/Content/Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/Document/Content/Handler.ts)
mirrors document text so `getText()` always reflects unsaved editor state.

> ```ts
> // Services/Handler/Document/Content/Handler.ts
> // $acceptModelChanged -> apply incremental edits to documentContentCache
> ```

> [!NOTE]
>
> The content cache, not the disk, is the source of truth for language
> providers.

---

## Extensions and Modules&#x2001;🧬

-   **Extension** -
    [Services/Extension/Host/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts)
    owns activation and deactivation;
    [Extension/Context.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Context.ts)
    builds the `ExtensionContext` handed to `activate()`.
-   **Extensions** -
    [Services/Extensions/Scanner.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extensions/Scanner.ts)
    is a facade over today's registry, shaped like VS Code's scanner service so
    the implementation can be swapped later.
-   **Module** / **ModuleInterceptor** -
    [Services/Module/Interceptor.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Module/Interceptor.ts)
    performs AST-based sandboxing and security-aware caching;
    [Services/ModuleInterceptor](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/ModuleInterceptor)
    is its barrel, kept separate because the class is one tightly-coupled unit.
-   **Init** -
    [Services/Init/Data.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Init/Data.ts)
    carries the commit, version, parent PID and extension list Mountain sends at
    startup.

> ```ts
> // Services/Init/Data.ts - the payload that starts the host
> readonly parentPid: number;
> readonly extensions: ReadonlyArray<unknown>;
> ```

> [!NOTE]
>
> `parentPid` is how Cocoon notices Mountain has died and exits rather than
> lingering.

---

## API Factory and Interfaces&#x2001;🏭

**API** -
[Services/API/Factory/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts)
constructs the per-extension `vscode` object, scoped and security-checked, and
wires it to the Universal Spine through the Mountain client.

[Interfaces](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces)
keeps the contracts separate from the implementations so a service can be
mocked or replaced without touching its callers.

| Group  | Path                                                                                                                    | Contents                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| I      | [Interfaces/I](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/I)                                  | Configuration, Error, Extension, File, Module, Mountain, Performance, Security, Terminal |
| IAPI   | [Interfaces/IAPI](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPI)                            | API factory service contract                       |
| IGRPC  | [Interfaces/IGRPC](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IGRPC)                          | gRPC server contract, per Mountain's Vine spec     |

> ```ts
> // Interfaces/IGRPC/Server/Service.ts
> export interface IGRPCServerService { start(): Promise<void>; }
> ```

> [!NOTE]
>
> Every interface carries `_serviceBrand` so structurally similar services stay
> distinct to the type checker.

---

## Resilience and Observability&#x2001;🩺

-   **Error** -
    [Services/Error/Handling/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Error/Handling/Service.ts)
    wraps calls in a circuit breaker with exponential backoff.
-   **Dual** -
    [Services/Dual/Track.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dual/Track.ts)
    tries Mountain first and falls back to a Node implementation when Mountain
    answers `Unknown method`, which is what lets the Rust port proceed one
    method at a time without breaking extensions.
-   **Health** and **Metrics** -
    [Services/Health.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Health.ts)
    tracks component health;
    [Services/Metrics/Collector.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Metrics/Collector.ts)
    is a minimal counter map.
-   **Performance** -
    [Services/Performance/Monitoring/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Performance/Monitoring/Service.ts)
    is now a deliberate zero-overhead no-op shim; the Effect Telemetry service
    replaced it.
-   **Security** -
    [Services/Security/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Security/Service.ts)
    enforces policy and writes the audit log.
-   **Dev** -
    [Services/Dev/Log.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dev/Log.ts)
    is a tag-filtered logger mirroring Mountain's `dev_log!` macro.

> ```sh
> Trace=config-prime tail -f Mountain.dev.log
> ```

> [!NOTE]
>
> Cocoon's tagged lines appear inside Mountain's dev log prefixed with
> `[Cocoon stdout]`.

### Telemetry&#x2001;📡

[Telemetry](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry)
exports spans and product events without pulling in an SDK.
[OTLPBridge.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/OTLPBridge.ts)
POSTs a single `resourceSpans` payload; the **PostHog** tree
(**Post**/Hog/Bridge, Buffer, Configuration, Event, Identifier, Transport)
batches product events and fails silently by design.

> ```ts
> // Telemetry/PostHog/Transport.ts - telemetry must never raise
> const RequestTimeoutMilliseconds = 5000;
> ```

> [!WARNING]
>
> Both bridges are dropped from production bundles by esbuild's `define`
> substitution.

### Debug server&#x2001;🐞

[Debug/Server.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug/Server.ts)
is the Node half of a dual-layer inspection surface that speaks the same wire
protocol as Mountain's Rust server, on port `9934` by default.

> ```sh
> curl 127.0.0.1:9934/health
> ```

> [!IMPORTANT]
>
> The listener binds `127.0.0.1` only and never starts unless `DebugServer`
> explicitly opts the Cocoon layer in.

---

## Type Conversion&#x2001;🔄

[TypeConverter](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter)
translates between the `vscode` types extensions hold and the DTOs the wire
carries. It exists because neither side may leak its representation into the
other.

| Area      | Converts                                                        |
| --------- | --------------------------------------------------------------- |
| Main      | URI, Range, Text edits, Markdown strings, View columns, Workspace folders |
| Dialog    | Open and save options, filters, **Dialog** results                |
| Quick     | Quick input items                                                 |
| Status    | Status bar items                                                  |
| TreeView  | Tree items and options                                            |
| Webview   | Content, panel and show options to DTOs                           |
| Workspace | Workspace edits                                                   |

> ```ts
> // TypeConverter/Main/URI.ts - split out to break an import cycle
> import type { UriComponents } from "@codeeditorland/output/…/uri.js";
> ```

> [!NOTE]
>
> `Command.ts` and `Task.ts` sit at the top of this tree because they are used
> by every namespace.

### Webview panels&#x2001;🖼️

[WebviewPanel](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel)
implements panel lifecycle:
[Factory.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Factory.ts)
creates and tracks panels,
[Panel.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Panel.ts)
implements one panel,
[Message.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Message.ts)
carries bidirectional messages,
[State.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/State.ts)
and
[Serializer.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Serializer.ts)
persist and restore it, and **Webview** holds the inner implementation.

> ```ts
> // WebviewPanel/Factory.ts - the registry, not the panel, owns lifetime
> ```

> [!NOTE]
>
> Panel state is synchronised with Mountain so a reload can restore an open
> webview.

---

## Utility&#x2001;🧰

[Utility](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility)
holds the small shared pieces the rest of the tree depends on.

-   **Result** -
    [Utility/Result.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Result.ts)
    is the `Ok`/`Err` union used for IPC error propagation.
-   **Tier** -
    [Utility/Tier.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Tier.ts)
    resolves every tier flag, reading `globalThis.__LandTiers` first and
    `process.env` second.
-   **Event** -
    [Utility/Event/Stream.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Event/Stream.ts)
    bridges the VS Code `Event` API with a plain `Set`.
-   **Glob** -
    [Utility/Glob/To/Regex.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Glob/To/Regex.ts)
    converts a VS Code glob to an anchored `RegExp`, shared by `findFiles` and
    document selectors so both agree.
-   **Land** -
    [Utility/Land/Fix/Log.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Land/Fix/Log.ts)
    prints the resolved-tier boot banner.

> ```ts
> // Utility/Result.ts
> export type Result<T, E = Error> = Ok<T> | Err<E>;
> ```

> [!NOTE]
>
> One `Result` shape across IPC means a handler failure is a value, never an
> exception crossing the boundary.

---

## Mountain Integration&#x2001;⛰️

Two paths reach Mountain. **Integration** -
[Integration/Mountain/Client.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration/Mountain/Client.ts)
is a convenience wrapper over the client service, while
[Services/Mountain](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Mountain)
holds the service itself and the gRPC client types.

**Echo** -
[Services/Echo/Action/Client.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Echo/Action/Client.ts)
provides bidirectional EchoAction communication with the Mountain Spine and is
Cocoon-only, since it requires a Node host.

**Configuration** -
[Configuration/Mountain/Config.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/Mountain/Config.ts)
defines host, timeout and retry settings for that connection;
[Services/Configuration.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Configuration.ts)
synchronises extension-visible configuration over `config.get` and
`config.update`.

> ```ts
> // Services/Mountain/gRPC/Client.ts is a deprecated dead layer - do not extend
> ```

> [!WARNING]
>
> `MountainGRPCClientLayer` is exported but never provided, and its method
> names do not match any Mountain handler.

---

## Codegen&#x2001;🏗️

[Codegen](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen)
generates the extension-host bridge from VS Code's own sources, so the two ends
of each RPC cannot drift apart by hand.

-   **Extract** -
    [Codegen/Extract](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Extract)
    narrows the tree to `extHost*` files and iterates their decorators.
-   **Emit** -
    [Codegen/Emit](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Emit)
    writes the paired upstream and MainThread schema; re-running on an
    unchanged record is byte-identical.
-   **Run** and **Type** -
    [Codegen/Run](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Run)
    drives the pipeline and
    [Codegen/Type](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Type)
    records decorator shapes.

> ```ts
> // Codegen/Codegen.ts - exits non-zero on any CodegenProblem
> const Main = async (): Promise<void> => { … };
> ```

> [!IMPORTANT]
>
> Codegen runs from `prepublishOnly.sh` and halts the build loudly rather than
> shipping a stale bridge.

---

## Build and Scripts&#x2001;📦

[ESBuild.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.ts)
holds the shared build options and reads `Clean`, `Meta` and `NODE_ENV`;
[ESBuild.js](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.js)
is its emitted companion. The per-target configs live under
[Configuration/ESBuild](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild):
Base, Bootstrap, Compile and Target, plus an Environment constant module.

**Run** -
[Run.sh](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Run.sh)
is the watch-mode development build.
[prepublishOnly.sh](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/prepublishOnly.sh)
generates the DualTrack route manifest, builds the tree, then bundles the
self-contained Bootstrap entry for `.app` distribution.

**Scripts** -
[Scripts/PerformanceBenchmark.js](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Scripts/PerformanceBenchmark.js)
exercises the services under a realistic workload.

> ```sh
> pnpm Run
> ```

> [!NOTE]
>
> `pnpm Run` maps to `sh Source/Run.sh`, which builds configuration first and
> then watches the TypeScript tree.

---

**Project Maintainers:** Source Open
([Source/Open@Editor.Land](mailto:Source/Open@Editor.Land)) |
[GitHub Repository](https://github.com/CodeEditorLand/Cocoon) |
[Report an Issue](https://github.com/CodeEditorLand/Cocoon/issues)
