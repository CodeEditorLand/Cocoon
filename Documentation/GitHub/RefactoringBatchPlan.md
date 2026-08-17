# Cocoon Source Refactoring Batch Plan

This document is the refactoring plan-of-record for the Cocoon extension host,
paired with an architectural map of the tree the plan operates on.

It has two halves. The first half is the original batch plan, preserved as
written. The second half documents the source tree as it exists on `Current`,
so a reader can tell which parts of the plan have already shipped and which
are still proposals.

> [!IMPORTANT]
>
> Batch 1 has landed, but not in the shape the plan proposed - the reconciliation table below records every difference.

## Phase 1: Orchestration & Core Services

Phase 1 targets the service composition root: the single place where Cocoon
decides which service implementations exist and how a caller reaches them.

Everything else in the tree - IPC, codegen, the patch process, the type
converters - depends on that root resolving cleanly, so it is refactored
first.

---

## Batch 1: ServiceMapping Split (Highest Priority)

### Target: `Element/Cocoon/Source/ServiceMapping.ts` (220 lines)

**Current Status**: Contains multiple orchestration objects in one file

**Split Strategy**:

```
Element/Cocoon/Source/Orchestration/
├── OldStyleServices.ts      - Old-style service configuration
├── EffectServices.ts        - Effect-TS service configuration
└── ServiceMapping.ts        - Backwards compatibility wrapper
```

**File 1: `Orchestration/OldStyleServices.ts`**

```typescript
/**
 * @module OldStyleServices
 * @description
 * Provides dependency injection for traditional Promise-based service architecture.
 * Legacy services that use async/await patterns instead of Effect-TS.
 *
 * @see {@link Element/Cocoon/Source/Services/} Legacy service implementations
 * @see {@link Element/Cocoon/Source/Orchestration/EffectServices.ts} Modern Effect-TS services
 *
 * @deprecated Prefer EffectServices for new
```

> [!NOTE]
>
> The two blocks above are the plan's proposed tree and JSDoc header, quoted verbatim; the shipped file carries a shorter `@module ServiceMapping` header instead.

### Plan vs shipped layout&#x2001;🔍

The split happened, but the naming and nesting diverged. Nothing named
`Orchestration/` was ever created, and no file called `ServiceMapping.ts`
exists at the root of
[Source](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source).

| Plan says | Tree has | Note |
| --- | --- | --- |
| `Source/ServiceMapping.ts` (220 lines) | [Source/Service/Mapping.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts) (54 lines) | Split completed; the file shrank rather than growing a wrapper |
| `Source/Orchestration/` | [Source/Service/](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service) | Directory shipped under a singular name |
| `Orchestration/OldStyleServices.ts` | [Source/Services/](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services) | Legacy Promise services stayed in the plural directory; no aggregating file was written |
| `Orchestration/EffectServices.ts` | `EffectServices` const inside [Source/Service/Mapping.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts) | Backed by the [Service/Effect](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect) barrel |

> [!WARNING]
>
> Treat the two blocks above as historical intent, not as navigation - the paths inside them do not resolve on `Current`.

## Source Tree Map&#x2001;🗺️

The top level of
[Source](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source)
divides into build tooling, transport, service implementations and
conversion utilities.

| Directory | Responsibility |
| --- | --- |
| [Bootstrap](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap) | Process entry point and the WebSocket server that fronts it |
| [Codegen](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen) | Extracts extension-host declarations from upstream VS Code and emits schemas |
| [Configuration](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration) | ESBuild build configuration and Mountain wiring |
| [Debug](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug) | Opt-in debug command server |
| [Integration](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration) | Mountain client integration surface |
| [Interfaces](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces) | Service contracts consumed by both the legacy and Effect stacks |
| [IPC](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC) | Wire protocol, channels, handlers and message framing |
| [PatchProcess](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess) | Runtime patching of the host process, with validation and a security gate |
| [Platform](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform) | OS, environment, process and logging primitives |
| [Scripts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Scripts) | Standalone tooling, currently the performance benchmark runner |
| [Service](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service) | Effect-TS composition root - the Batch 1 target |
| [Services](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services) | Legacy Promise-based service implementations |
| [Shim](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim) | Node module interception shim |
| [Telemetry](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry) | OTLP bridge and PostHog transport |
| [TypeConverter](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter) | Marshals VS Code API types across the IPC boundary |
| [Utility](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility) | Result type, event streams, glob translation, tiering |
| [WebviewPanel](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel) | Webview panel factory, state and serialization |

Two build entry points sit loose at the root alongside these directories.
[ESBuild.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.ts)
declares the shared build options and reads its flags from the environment -
`export const Clean = process.env["Clean"] === "true"` - while
[ESBuild.js](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.js)
is its compiled counterpart.

> [!NOTE]
>
> `Clean` and `Meta` are read once at module load, so flipping either requires a fresh build invocation.

Two shell scripts complete the set.
[Run.sh](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Run.sh)
drives development builds, compiling the configuration tree first and then
rebuilding `Source/**/*.ts` in watch mode against the target config emitted
from
[Target.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild/Target.ts),
and
[prepublishOnly.sh](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/prepublishOnly.sh)
runs before publish.

> [!NOTE]
>
> The configuration tree is compiled in a first pass because the watched source build consumes the compiled target config from it.

## Orchestration Layer&#x2001;⚙️

[Service/Mapping.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts)
is the composition root. It is a lean singleton registry: no `Layer`, no
`pipe`, no `provide` machinery.

- `composeAppLayer()` returns a plain record of seven already-initialised services
- `getTelemetry()`, `getHealth()`, `getMountainClient()` and their siblings return one service each
- `AppServices` is inferred from `composeAppLayer`, so the record shape is the single source of truth

> [!NOTE]
>
> Callers receive live instances directly, so there is no layer graph to resolve at call time.

### Effect services&#x2001;🧪

[Service/Effect](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect)
holds the implementations behind those singletons, re-exported through its
barrel as `export { BootstrapTag, BootstrapLive, BootstrapMock, runBootstrap }`.

- [Bootstrap.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Bootstrap.ts) - host startup, exporting `runBootstrap` and a `BootstrapResult`
- [Extension.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Extension.ts) - extension lifecycle as an Effect service
- [Health.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Health.ts) - liveness and readiness reporting
- [RPCServer.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/RPCServer.ts) - RPC server lifecycle
- [Telemetry.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Telemetry.ts) - telemetry emission
- [Module/Interceptor.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Module/Interceptor.ts) - module resolution interception
- [Mountain/Client.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Mountain/Client.ts) - Mountain transport client

> [!NOTE]
>
> Every Effect service exports a Tag, a Live and a Mock, which is what lets the registry in `Mapping.ts` stay flat.

## IPC&#x2001;🔌

[IPC](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC)
carries every call between the editor and the extension host. Its protocol
module defines `export type IPCProtocolMessage = IPCRequest | IPCResponse |
IPCNotification`.

- [Protocol.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Protocol.ts) - the three message shapes plus the `ProtocolMessageType` enum
- [Channel.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Channel.ts) - `BaseMessage` and the `IPCMessage` union of request, response and event
- [Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Handler.ts) - the `IPCHandler` class plus `RequestId` and `HandlerOptions`
- [Message](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Message) - serialization, batching, validation and `VSBuffer` framing
- [Type/Converter.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Type/Converter.ts) - conversion helpers used on the wire

> [!NOTE]
>
> Requests expect a response and notifications do not, which is the distinction routing switches on.

## Codegen&#x2001;🏗️

[Codegen](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen)
walks the same VS Code source tree Wind walks, but narrows to the extension
host subtree and emits Cocoon-side `IExtHost*Upstream` schemas grounded in
real upstream source. It reuses every Wind extractor verbatim; only the
file-name predicate and the emit destination differ.

- [Extract](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Extract) - `IsExtHostFile` narrows the walk, and the iterator reads decorators
- [Emit](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Emit) - `EmitExtHostSchema` writes the generated schema
- [Run](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Run) - `RunExtHostCodegen` drives the pipeline and returns a `RunExtHostCodegenSummary`
- [Type](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Type) - decorator record types shared across the stages

> [!NOTE]
>
> The barrel exports only `RunExtHostCodegen` and its options types, so the extractors stay internal.

## Configuration and Build&#x2001;📦

[Configuration/ESBuild](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild)
composes the build. Its barrel re-exports `BaseConfig`, `TargetConfig` and
`CompileConfig`, alongside
[Bootstrap.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild/Bootstrap.ts),
[Cocoon.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild/Cocoon.ts)
and
[Target.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild/Target.ts).

[Configuration/Mountain/Config.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/Mountain/Config.ts)
holds Mountain settings, and
[Integration/Mountain/Client.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration/Mountain/Client.ts)
is the integration-side client.

> [!NOTE]
>
> Three configs are layered rather than merged, so a target can override the base without editing it.

## Bootstrap&#x2001;🚀

[Bootstrap](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap)
starts the host.
[Implementation/Cocoon/Main.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/Implementation/Cocoon/Main.ts)
is the process entry point, and
[WebSocket/Server.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/WebSocket/Server.ts)
puts a socket in front of it via `export async function
StartWebSocketServer(): Promise<void>`.

> [!NOTE]
>
> The server resolves once it is listening; connection handling continues after the promise settles.

## Debug&#x2001;🐞

[Debug/Server.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug/Server.ts)
exposes a small command server for development. It is explicitly started and
stopped rather than always-on: `RegisterHooks(Next: CommandHooks)` installs
handlers, `Start(): number | null` binds and returns the port, and `Stop()`
tears it down.

> [!NOTE]
>
> `Start` returns `null` when the server is disabled, which is the signal callers check before wiring hooks.

## PatchProcess&#x2001;🩹

[PatchProcess](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess)
rewrites parts of the running host.
[Loader.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Loader.ts)
finds patches,
[Validator.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Validator.ts)
checks them,
[Security.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Security.ts)
gates them, and
[Patcher.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Patcher.ts)
applies them through `RunPatchProcess` and `ReloadSecurityPolicy`.

> [!WARNING]
>
> `ReloadSecurityPolicy` re-reads the gate at runtime, so a policy change takes effect without restarting the host.

## Platform&#x2001;🖥️

[Platform](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform)
is the OS abstraction layer, re-exported as namespaces from its barrel. Its
platform identity is a closed union: `export type PlatformName = "Web" |
"Windows" | "Mac" | "Linux"`.

- [OS.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/OS.ts) - `PlatformNumber`, `OperatingSystem`, `OSArchitecture` and path separators
- [Environment.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Environment.ts) - environment inspection
- [Process.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Process.ts) - process-level helpers
- [Logger.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Logger.ts) - platform logging
- [Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Service.ts) - platform service surface
- [FiddeeRoot.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/FiddeeRoot.ts) - root path resolution
- [VSCode/Type.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/VSCode/Type.ts) - VS Code platform types

> [!NOTE]
>
> `Web` is a first-class platform here, which is why path handling is never assumed to be POSIX.

## Interfaces&#x2001;📐

[Interfaces](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces)
holds the contracts both service stacks implement.
[I](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/I)
covers configuration, error handling, extension host, file system, module
interception, Mountain client, performance monitoring, security and
terminal.
[IAPI](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPI)
and
[IGRPC](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IGRPC)
cover API construction and the gRPC server respectively.

[IAPIFactory.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPIFactory.ts)
pairs the contract with its injection token: `export const IAPIFactory:
unique symbol = Symbol.for("IAPIFactory")`, alongside
`APIConstructionRequest`, `APIConstructionResult` and
`APIValidationResult`.

> [!NOTE]
>
> The interface and the symbol share a name, so one import gives both the type and the token.

## Services&#x2001;🧰

[Services](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services)
is the legacy Promise-based stack the plan calls "old-style". It is the
largest directory in the tree and remains in use.

| Module | Purpose |
| --- | --- |
| [API/Factory](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory) | Constructs the VS Code API object handed to extensions |
| [Command.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Command.ts) | Command registration and dispatch |
| [Configuration.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Configuration.ts) | `Configuration` class plus its `ConfigurationLive` binding |
| [Dev/Log.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dev/Log.ts) | `CocoonDevLog` tagged development logging |
| [Dual/Track.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dual/Track.ts) | Dual-track dispatch between the Rust and Node implementations |
| [Echo/Action](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Echo/Action) | `CocoonEchoClient` and the echo action protocol |
| [Error/Handling](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Error/Handling) | `ErrorHandlingService` with circuit-breaker state |
| [Extension](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension) | Extension context and host service |
| [Extensions/Scanner.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extensions/Scanner.ts) | `ScanAllExtensions` discovery and scan statistics |
| [File/System](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/File/System) | File system service |
| [gRPC/Server](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/gRPC/Server) | gRPC server implementation |
| [Handler](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler) | Request routing and the VS Code API namespace implementations |
| [Health.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Health.ts) | Health reporting for the legacy stack |
| [Init/Data.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Init/Data.ts) | Initialization payload assembled at startup |
| [Language/Provider](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Language/Provider) | Language provider registration |
| [Logger.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Logger.ts) | Legacy logging service |
| [Metrics/Collector.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Metrics/Collector.ts) | Metric collection |
| [Module/Interceptor.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Module/Interceptor.ts) | Module interception entry point |
| [ModuleInterceptor](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/ModuleInterceptor) | Interceptor index and its types |
| [Mountain](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Mountain) | Mountain client and gRPC bridge |
| [Performance/Monitoring](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Performance/Monitoring) | Performance monitoring service |
| [Security/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Security/Service.ts) | Security policy service |
| [Terminal/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Terminal/Service.ts) | Terminal creation and lifecycle |
| [Window](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window) | Dialogs, progress, quick input, status and webviews |
| [Workspace.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Workspace.ts) | Workspace folder and document services |

[Dual/Track.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dual/Track.ts)
is the migration seam: `IsRustDeferralEnabled(Method)` decides per method
whether to defer, and `TryMountainThenNode<T>()` runs the Rust path first
with the Node implementation as fallback.

> [!NOTE]
>
> `IsUnknownMethodError` distinguishes a missing Rust method from a genuine failure, which is what makes the fallback safe.

### Handler namespaces&#x2001;🧭

[Services/Handler/VscodeAPI](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/VscodeAPI)
implements the VS Code API surface namespace by namespace - commands,
languages, window, workspace, tasks, tests, debug, scm, comments,
authentication, env and extensions - while
[Request/Routing/Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/Request/Routing/Handler.ts)
dispatches incoming calls to them.

Discovery feeds that surface:
[Scanner.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extensions/Scanner.ts)
exposes `ScanAllExtensions`, returning `ScannedExtension` records plus a
`ScannerStatistics` summary.

> [!NOTE]
>
> The scanner reports statistics alongside the extensions, which the activation path logs on startup.

## TypeConverter&#x2001;🔁

[TypeConverter](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter)
marshals VS Code API types across the IPC boundary. It covers
[Dialog](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Dialog),
[Main](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Main),
[Quick](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Quick),
[Status](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Status),
[TreeView](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/TreeView),
[Webview](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Webview),
[Workspace](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Workspace),
[Task.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Task.ts)
and
[Command.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Command.ts).

The dialog converter flattens file filters for the wire through
`SerializeFilters(Filters?)`.

> [!NOTE]
>
> Filters arrive as a record and leave in a wire-safe shape, because the native dialog cannot receive the object form.

## Utility&#x2001;🧷

[Utility](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility)
holds the shared primitives. Errors are values here, not exceptions:
`export type Result<T, E = Error> = Ok<T> | Err<E>`.

- [Result.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Result.ts) - the `Ok`/`Err`/`Result` union used instead of throwing
- [Event/Stream.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Event/Stream.ts) - `CreateEventStream` and the `EventStream<T>` interface
- [Glob/To/Regex.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Glob/To/Regex.ts) - `GlobToRegex` translation for file matching
- [Tier.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Tier.ts) - tier classification
- [Land/Fix](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Land/Fix) - Land-specific fixups

> [!NOTE]
>
> The readonly `success` field is the discriminant, so narrowing a `Result` needs no type guard function.

## Remaining Subsystems&#x2001;🧵

Four areas sit outside Phase 1's scope but complete the picture.

[Telemetry](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry)
bridges to OTLP via
[OTLPBridge.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/OTLPBridge.ts)
and buffers events through
[PostHog](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/PostHog),
which splits into buffer, configuration, event, identifier and transport
modules, with
[Post/Hog](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/Post/Hog)
alongside it.

[WebviewPanel](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel)
owns panel creation, messaging, state and serialization through
[Factory.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Factory.ts),
[Panel.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Panel.ts),
[Serializer.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Serializer.ts)
and
[State.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/State.ts).

[Shim/NodeModuleInterceptor.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim/NodeModuleInterceptor.ts)
intercepts Node module resolution so extensions receive Cocoon's `vscode`
module, and
[Scripts/PerformanceBenchmark.js](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Scripts/PerformanceBenchmark.js)
measures the result.

Both telemetry and webview messaging consume the shared
`CreateEventStream<T>()` primitive rather than each defining an emitter.

> [!NOTE]
>
> Sharing one stream implementation is why a telemetry sink and a webview channel behave identically under backpressure.

## Corrections Applied&#x2001;📝

Four claims in the original plan did not survive checking against the tree
on `Current`. They are corrected in the reconciliation table above and
listed here for the record.

1. `Element/Cocoon/Source/ServiceMapping.ts` does not exist. The real file is
   `Source/Service/Mapping.ts`, and it is 54 lines, not 220.
2. `Source/Orchestration/` was never created. The directory shipped as
   `Source/Service/`.
3. `Orchestration/OldStyleServices.ts` was never written. Legacy services
   remained in `Source/Services/`.
4. `Orchestration/EffectServices.ts` was never written. `EffectServices` is
   an exported constant inside `Source/Service/Mapping.ts`.

> [!NOTE]
>
> Both original blocks are retained unchanged as the historical statement of intent, even though the paths inside them no longer resolve.
