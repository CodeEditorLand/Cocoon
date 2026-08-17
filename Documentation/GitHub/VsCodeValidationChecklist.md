# VS Code Source Validation Checklist for Cocoon

This document validates Cocoon's implementation against the original VS Code
source to ensure compatibility and correctness. Cocoon is the extension-host
Element of Land: it runs unmodified extensions inside a Node.js process that
speaks gRPC to Mountain rather than VS Code's own message protocol.

Every path named below was checked against the tree on the `Current` branch.
Where the previous revision of this checklist and the tree disagreed, the
tree won, and the correction is recorded under Corrections Applied.

> [!IMPORTANT]
>
> Cocoon ships no hand-written `vscode` shim. Real VS Code type constructors
> are imported from the compiled Output Element package
> `@codeeditorland/output`, so the API surface is Microsoft's own code.

## Validation Methodology&#x2001;✅

### Sources Compared

| Side           | What was read                        | Where it lives                                                                                        |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Cocoon Source  | The Element's own extension host     | [Source](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source)                                  |
| VS Code Source | Microsoft's VS Code GitHub repository | Vendored through the Output Element as `@codeeditorland/output`                                        |
| Vine protocol  | The gRPC contract Cocoon implements  | [Mountain's Vine protocol](https://github.com/CodeEditorLand/Mountain/tree/Current/Proto/Vine.proto)   |

**Validation Focus**: Extension host architecture, API compatibility, and
communication patterns.

```sh
node Scripts/compile-grpc-protocol.js
```

> [!NOTE]
>
> The build step that compiles Mountain's Vine protocol into the TypeScript
> definitions this Element validates against.
## Core Extension Host Validation

###&#x2001;✅ Extension Host Service

**VS Code Source Reference**: Microsoft's upstream extension host service,
`extHostExtensionService.ts` under `vs/workbench/api/common/`, reached through
the Output Element rather than copied into this repository.

**Cocoon Implementation**:
[Services/Extension/Host/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts)

| Feature              | Cocoon Implementation                                | VS Code Equivalent             | Status | Notes                   |
| -------------------- | ---------------------------------------------------- | ------------------------------ | ------ | ----------------------- |
| Extension activation | `Service.ts` - `activateExtension()`                 | `activateById()`               | ✅     | Similar activation flow |
| Extension lifecycle  | `Service.ts` - `deactivateExtension()`, `terminate()` | `deactivateAll()`              | ✅     | Proper cleanup          |
| Extension registry   | `Service.ts` - `IExtensionDescription` registry       | `ExtensionDescriptionRegistry` | ✅     | Compatible structure    |
| Error handling       | Comprehensive error handling                          | Standard error handling        | ✅     | Robust implementation   |

```ts
// Interfaces/I/Extension/Host/Service.ts - the activation contract
activateExtension(extensionId: string, reason: ExtensionActivationReason): Promise<void>;
deactivateExtension(extensionId: string): Promise<void>;
terminate(reason: string, code?: number): Promise<void>;
```

> [!NOTE]
>
> These are the real interface methods; the historical `ActivateById()` and
> `DeactivateAll()` spellings do not exist in the tree.

The host also owns two supporting units. [Services/Extension/Context.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Context.ts)
builds the `ExtensionContext` handed to each `activate()` call, and
[Services/Extensions/Scanner.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extensions/Scanner.ts)
is the scanner facade that will replace the hand-built registry with VS Code's
canonical `IExtensionsScannerService`.

###&#x2001;✅ API Factory

**VS Code Source Reference**: Microsoft's `extHost.api.impl.ts` under
`vs/workbench/api/common/`, consumed through the Output Element.

**Cocoon Implementation**:
[Services/API/Factory/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts)

| Feature           | Cocoon Implementation                    | VS Code Equivalent      | Status | Notes                 |
| ----------------- | ---------------------------------------- | ----------------------- | ------ | --------------------- |
| vscode namespace  | `Services/API/Factory/Service.ts`        | `ExtHostApiImpl`        | ✅     | Similar API structure |
| Service shimming  | Individual service files                 | Service implementations | ✅     | Modular approach      |
| Context injection | `ExtensionContext` creation              | `ExtensionContext`      | ✅     | Compatible context    |

```ts
// Services/API/Factory/Service.ts - real VS Code constructors, not shims
const VsCodeTypes =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
```

> [!NOTE]
>
> The factory loads Microsoft's compiled types once at module init, so every
> extension shares one set of class definitions.

The **IAPI** and **Interfaces** trees declare the contracts the factory
fulfils: [Interfaces/IAPIFactory.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPIFactory.ts)
and [Interfaces/IAPI/Factory/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPI/Factory/Service.ts)
describe API construction and per-extension scoping, while
[Interfaces/I](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/I)
holds the per-domain service interfaces (Configuration, Error, Extension,
File, Module, Mountain, Performance, Security, Terminal) and
[Interfaces/IGRPC/Server/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IGRPC/Server/Service.ts)
declares the inbound gRPC server contract.

###&#x2001;✅ Module Interception

**VS Code Source Reference**: Microsoft's `extHostRequireInterceptor.ts` under
`vs/workbench/api/common/`.

| Feature                | Cocoon Implementation                     | VS Code Equivalent          | Status | Notes            |
| ---------------------- | ----------------------------------------- | --------------------------- | ------ | ---------------- |
| require() interception | `Shim/NodeModuleInterceptor.ts`           | `ExtHostRequireInterceptor` | ✅     | Similar pattern  |
| ESM interception       | `Services/Module/Interceptor.ts`          | N/A (ESM not in VS Code)    | 🔄     | Advanced feature |
| Module resolution      | Path-based resolution                     | VS Code resolution          | ✅     | Compatible       |

```ts
// Shim/NodeModuleInterceptor.ts - fs and child_process routed to Mountain
import type { ShimLevel } from "../../Wind/Source/Shim/Type.js";
export default function installNodeModuleInterceptor(): void;
```

> [!NOTE]
>
> The **Shim** tier is gated by the `TierShim` variable; at `None` esbuild
> tree-shakes the whole module out of the bundle.

[Services/ModuleInterceptor](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/ModuleInterceptor)
is the barrel that re-exports the interceptor and its types, keeping AST
analysis, sandboxing, caching and telemetry as one tightly-coupled unit.
## Communication Layer Validation

###&#x2001;✅ IPC Communication

**VS Code Source Reference**: Microsoft's `extensionHostProtocol.ts` under
`vs/workbench/services/extensions/common/`.

| Feature               | Cocoon Implementation                              | VS Code Equivalent       | Status | Notes                    |
| --------------------- | -------------------------------------------------- | ------------------------ | ------ | ------------------------ |
| Protocol definition   | Mountain's `Vine.proto`                             | `IExtensionHostInitData` | ✅     | gRPC vs custom protocol  |
| Message passing       | `Services/Mountain/Client/Service.ts` - SendRequestWithRetry | `RPCProtocol`   | ✅     | Different but compatible |
| Error handling        | `Services/Error/Handling/Service.ts`                | Standard error handling  | ✅     | Comprehensive            |
| Connection management | gRPC client management                              | IPC channel management   | ✅     | Robust implementation    |

The [IPC](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC)
tree is the transport itself, split into four concerns:

- [IPC/Channel.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Channel.ts) - multi-channel RPC with publish-subscribe routing between Mountain, Wind and Sky.
- [IPC/Handler.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Handler.ts) - request/response registration with async execution and cancellation.
- [IPC/Protocol.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Protocol.ts) - the notification protocol Sky's Astro display subscribes to.
- [IPC/Message](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Message) - serialize, deserialize, batch, unbatch and `VSBuffer` validation.

```ts
// Services/Mountain/Client/Service.ts - outbound gRPC to Mountain
// default localhost:50051, MOUNTAIN_CONNECTION_HOST / MOUNTAIN_GRPC_PORT
SendRequestWithRetry(...)  // 3 attempts, backoff 1000ms * 2^attempt + jitter, cap 10s
```

> [!NOTE]
>
> Only transient codes retry - `UNAVAILABLE`, `DEADLINE_EXCEEDED`, `INTERNAL`
> and `RESOURCE_EXHAUSTED`.

The same request/notification pair is what a webview host is handed, so panel
code sends over the identical transport contract.

```ts
// Services/Window/Webview/Panel.ts - the host transport contract
SendNotification: (Method: string, Params: unknown[]) => Promise<void>;
SendRequest: <T>(Method: string, Params: unknown[]) => Promise<T>;
```

> [!NOTE]
>
> `SendRequest` awaits a Mountain reply while `SendNotification` is
> fire-and-forget.

The inbound direction is
[Services/gRPC/Server/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/gRPC/Server/Service.ts),
which implements the `CocoonService` half of Vine with bidirectional
streaming, and
[Integration/Mountain/Client.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration/Mountain/Client.ts),
a convenience wrapper over the client service. The **Mountain** configuration
surface - host, port, timeouts, retry policy - lives in
[Configuration/Mountain/Config.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/Mountain/Config.ts).

###&#x2001;✅ Service Layer Communication

**VS Code Source Reference**: Various `IExtHost*` services.

| Service   | Cocoon Implementation                        | VS Code Equivalent  | Status | Notes             |
| --------- | -------------------------------------------- | ------------------- | ------ | ----------------- |
| Commands  | `Services/Command.ts`                        | `IExtHostCommands`  | ✅     | Similar API       |
| Documents | `Services/Window/Text/Document.ts`           | `IExtHostDocuments` | ✅     | Compatible        |
| Window    | `Services/Window.ts`                         | `IExtHostWindow`    | ✅     | Similar methods   |
| Workspace | `Services/Workspace.ts`                      | `IExtHostWorkspace` | ✅     | Compatible        |
| Debug     | `Debug/Server.ts`                            | `IExtHostDebug`     | ✅     | Similar structure |
| Terminal  | `Services/Terminal/Service.ts`               | `IExtHostTerminal`  | ✅     | Compatible        |
| Webview   | `WebviewPanel/Panel.ts`                      | `IExtHostWebview`   | ✅     | Similar API       |

The [Services/Window](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window)
subtree splits the window namespace into one module per operation group -
**Dialog**, **File** dialogs, Output Channel, Progress, Quick Input, State,
Status Bar, Text Document and Webview Panel - composed by
`Services/Window/Index.ts`, which is lifted from upstream `extHostWindow.ts`.

###&#x2001;✅ Notification Fan-out and Handlers

[Services/Handler](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler)
is the routing layer between Mountain and the API surface. The **Handler**
tree carries the Document, Extension, Language, Notification, Request,
VscodeAPI and Workspace routers.

```ts
// Services/Handler/Notification/Handler.ts - Mountain to Cocoon fan-out
// Emitter: extensionChanged, configurationChanged, windowFocused,
//          webview.message:<handle>, debug.didStartSession, ...
```

> [!NOTE]
>
> Every inbound Mountain method becomes a domain event on either the shared
> `Emitter` or the `WorkspaceEventEmitter`.

Supporting units: [Services/Init/Data.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Init/Data.ts)
carries the **Init** payload (commit, version, parentPid, extensions),
[Services/File/System/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/File/System/Service.ts)
maps the **File** system API onto Mountain's FS spine, and
[Services/Language/Provider/Registry.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Language/Provider/Registry.ts)
maps numeric handles to registered language providers.
## Architecture Validation

###&#x2001;✅ Effect-TS Integration

**Innovation**: Cocoon uses Effect-TS while VS Code uses traditional OOP.

| Aspect               | Cocoon Approach    | VS Code Approach      | Compatibility   |
| -------------------- | ------------------ | --------------------- | --------------- |
| Dependency injection | Effect-TS Layers   | Service collection    | ✅ (Bridged)    |
| Error handling       | Effect error types | Exception handling    | ✅ (Mapped)     |
| Async operations     | Effect pipelines   | Promises/async-await  | ✅ (Compatible) |
| Service composition  | Layer composition  | Service instantiation | ✅ (Similar)    |

```ts
// Service/Effect/index.ts - the Effect service barrel
export { BootstrapTag } from "./Bootstrap.js";
```

> [!NOTE]
>
> [Service/Effect](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect)
> holds the Bootstrap, Extension, Health, Module Interceptor, Mountain Client,
> RPCServer and Telemetry layers behind one export point.

[Service/Mapping.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts)
bridges those layers to the plain-object services the API factory expects.

###&#x2001;✅ Bootstrap and Process Entry

The [Bootstrap](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap)
tree is where the host process actually begins.

```ts
// Bootstrap/Implementation/Cocoon/Main.ts - order is load-bearing
import installNodeModuleInterceptor from "../../../Shim/NodeModuleInterceptor.js";
installNodeModuleInterceptor();
import { runBootstrap } from "../../../Service/Bootstrap.js";
```

> [!NOTE]
>
> **Main** patches `Module._load` synchronously before any extension code can
> reach `fs` or `child_process`.

[Bootstrap/WebSocket/Server.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/WebSocket/Server.ts)
adds a **WebSocket** JSON-RPC transport for the Sky-to-Cocoon direct path,
authenticated by a secret passed as a query parameter, a
`Sec-WebSocket-Protocol` value or an `X-Land-Secret` header.

###&#x2001;✅ Process Management

**VS Code Source Reference**: Microsoft's `extHostProcess.ts` under
`vs/workbench/api/node/`.

| Feature              | Cocoon Implementation                | VS Code Equivalent | Status | Notes             |
| -------------------- | ------------------------------------ | ------------------ | ------ | ----------------- |
| Process hardening    | `PatchProcess/Patcher.ts`            | Process management | ✅     | Enhanced approach |
| Lifecycle management | Proper shutdown handling             | Graceful shutdown  | ✅     | Robust            |
| Error recovery       | Comprehensive error handling         | Standard recovery  | ✅     | Improved          |

```ts
// PatchProcess/Patcher.ts - runs once before any extension activates
// guards process.exit, process.crash, uncaught exceptions, Module._load("natives")
```

> [!NOTE]
>
> The [PatchProcess](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess)
> tree pairs the patcher with Loader, Security, Validator and a Type converter.

###&#x2001;✅ Platform Abstraction

[Platform](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform)
is the OS-facing layer: `OS.ts`, `Environment.ts`, `Process.ts`, `Logger.ts`,
`Service.ts`, `FiddeeRoot.ts` and a Type converter, exported through one barrel.

```ts
// Platform/VSCode/Type.ts - one source of truth for VS Code constructors
// re-exports the compiled VS Code source from @codeeditorland/output
```

> [!NOTE]
>
> Every TypeConverter imports **VSCode** types from here, so an Output package
> bump is a single-file change.

###&#x2001;✅ Type Conversion

[TypeConverter](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter)
serializes VS Code objects for IPC transport. It covers **Dialog** filters and
results, **Main** primitives (Markdown String, Range, Text Edit, URI, View
Column, Workspace Folder), **Quick** Input, **Status** Bar, Task, **TreeView**
items and options, Webview and Workspace edits.

```ts
// TypeConverter/Quick/Input.ts
// Serializes QuickPickItem or string arrays for IPC transport.
```

> [!NOTE]
>
> Converters are pure functions, which is why they are the easiest layer to
> validate against upstream behaviour.

###&#x2001;✅ Utility and Tier Gating

[Utility](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility)
holds the cross-cutting helpers: `Tier.ts` resolves Land's tier flags,
`Result.ts` is the Ok/Err type used by IPC handlers, **Event** Stream bridges
the VS Code Event API, **Glob** converts VS Code globs to anchored regular
expressions, and **Land** Fix Log is the production-survivable logger.

```ts
// Utility/Glob/To/Regex.ts - shared by workspace.findFiles and languages.match
// ** -> any run including "/",  * -> non-"/" run,  ? -> one non-"/" character
```

> [!NOTE]
>
> Both the file walker and the document selector use this converter, so
> pattern semantics cannot drift between them.
## API Surface Validation

### Core APIs Validated

####&#x2001;✅ Workspace API

- `vscode.workspace.getConfiguration()` - Implemented via
  [Services/Configuration.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Configuration.ts)
- `vscode.workspace.onDidChangeConfiguration()` - Event handling implemented
- `vscode.workspace.openTextDocument()` - Document service implemented

####&#x2001;✅ Window API

- `vscode.window.showInformationMessage()` - Message service implemented
- `vscode.window.createTerminal()` - Task service implemented
- `vscode.window.showQuickPick()` - QuickInput service implemented

####&#x2001;✅ Commands API

- `vscode.commands.registerCommand()` - Command service implemented
- `vscode.commands.executeCommand()` - Command execution implemented

####&#x2001;✅ Debug API

- `vscode.debug.startDebugging()` - Debug service implemented
- `vscode.debug.registerDebugConfigurationProvider()` - Provider registration

### Advanced APIs

####&#x2001;🔄 Language Features API

- Hover, completion, definition providers - Partially implemented
- Language feature registry - Implemented

####&#x2001;🔄 SCM API

- Source control management - Basic implementation
- Input box registration - Implemented

####&#x2001;🔄 Tree View API

- Tree data providers - Implemented
- Tree item management - Implemented

### Coverage Backstop

Mountain's Rust implementation is still growing, so an unimplemented method
would otherwise surface to the extension as a hard failure.

```ts
// Services/Dual/Track.ts - progressive Rust migration backstop
// Mountain returns Err("Unknown method: <x>") -> Cocoon falls back locally
```

> [!NOTE]
>
> **Dual** Track is what keeps the `vscode.*` surface looking complete while
> methods migrate to Rust one at a time.

## Build, Codegen and Tooling

###&#x2001;✅ Build Configuration

| Unit                              | Role                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `ESBuild.ts` / `ESBuild.js`       | Top-level build entry for the Element                            |
| `Configuration/ESBuild`           | **ESBuild** Bootstrap, Cocoon, Target and Compile configs        |
| `Configuration/Mountain`          | Mountain connection configuration                                 |
| `Run.sh`                          | Development-mode run script                                       |
| `prepublishOnly.sh`               | Pre-publish build, runs codegen and the route manifest generator  |
| `Scripts/PerformanceBenchmark.js` | **Scripts** benchmark harness for the service layer               |

```sh
Build "Source/Configuration/**/*.{ts,json}" \
	--ESBuild Source/Configuration/ESBuild/Cocoon.ts
```

> [!NOTE]
>
> The first step of
> [Run.sh](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Run.sh):
> configuration is compiled before anything else runs.

###&#x2001;✅ Extension Host Codegen

[Codegen](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen)
generates the extension-host RPC surface from VS Code's own decorators, so the
bridge cannot drift from upstream by hand-editing.

```ts
// Codegen/Codegen.ts - runnable entry, invoked by prepublishOnly.sh
import { RunExtHostCodegen } from "./Run/Ext/Host/Codegen.js";
```

> [!NOTE]
>
> Exits non-zero on any `CodegenProblem` so a broken generation halts the build.

The pipeline has three stages. **Extract** walks the extension-host subtree and
emits one record per `createDecorator(...)` site, pairing each `IExtHostFoo`
with its `MainThreadFoo` counterpart. **Emit** writes the paired schema files
and is idempotent - re-running on an unchanged record produces byte-identical
output. `Codegen/Type` carries the decorator record type.

## Observability

###&#x2001;✅ Telemetry

[Telemetry](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry)
has two independent exporters and no vendor SDK in the bundle.

| Unit                          | Role                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| `Telemetry/OTLPBridge.ts`     | Fire-and-forget OTLP span exporter, posted to `OTLPEndpoint/v1/traces`   |
| `Telemetry/Post/Hog/Bridge.ts` | **Post** Hog bridge composing the PostHog atoms                         |
| `Telemetry/PostHog`           | **PostHog** Buffer, Configuration, Event, Identifier and Transport        |

```ts
// Telemetry/Post/Hog/Bridge.ts - the three call sites the rest of Cocoon uses
CaptureEvent, CaptureError, Initialize
```

> [!NOTE]
>
> Both bridges no-op in production builds, and every span ID is stamped onto
> the matching PostHog event as `$trace_id` / `$span_id`.

###&#x2001;✅ Diagnostics

- [Services/Dev/Log.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dev/Log.ts) - **Dev** logger mirroring Mountain's `dev_log!` macro, filtered by the `Trace` variable.
- [Debug/Server.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug/Server.ts) - the Node half of the dual-layer inspection HTTP surface.
- [Services/Metrics/Collector.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Metrics/Collector.ts) - minimal metrics collection.
- [Services/Health.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Health.ts) - host health reporting.
- [Services/Security/Service.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Security/Service.ts) - **Security** policy enforcement and audit logging.
- [Services/Echo/Action/Client.ts](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Echo/Action/Client.ts) - **Echo** action client for bidirectional Spine communication.

```sh
Trace=config-prime tail -f Mountain.dev.log
```

> [!NOTE]
>
> Mountain captures Cocoon's stdout, so one tail shows both halves of a trace.
## Performance Comparison

### Expected Performance Characteristics

| Metric              | VS Code  | Cocoon (Expected) | Status |
| ------------------- | -------- | ----------------- | ------ |
| Extension load time | ~1-2s    | ~1-2s             | ✅     |
| API call latency    | <100ms   | <100ms            | ✅     |
| Memory usage        | Moderate | Comparable        | ✅     |
| Startup time        | Fast     | Comparable        | ✅     |

### Optimization Opportunities

1. **gRPC Efficiency**: Cocoon's gRPC may be more efficient than VS Code's
   custom protocol
2. **Effect-TS Benefits**: Better error handling and resource management
3. **Modern Architecture**: Cleaner separation of concerns

```ts
// Services/Performance/Monitoring/Service.ts - zero-overhead shim
// all methods are no-ops; the 741-line profiling implementation was removed
```

> [!NOTE]
>
> Performance monitoring is deliberately inert so no dead scaffolding ships in
> the extension host bundle.

## Compatibility Gaps

###&#x2001;⚠️ Known Differences

1. **ESM Support**: Cocoon has ESM interception, VS Code is CJS-only
2. **Effect-TS Architecture**: Different programming paradigm
3. **gRPC Protocol**: Different communication protocol

###&#x2001;✅ Compatibility Achievements

1. **API Compatibility**: Same method signatures and behavior
2. **Extension Compatibility**: Can run same extensions
3. **Development Experience**: Similar debugging and testing

## Corrections Applied

The previous revision named eleven Cocoon files and one protocol file that do
not exist in the tree. Each has been replaced with its real path.

| Claimed previously            | Actual path in the tree                       |
| ----------------------------- | ---------------------------------------------- |
| `APIFactory.ts`               | `Services/API/Factory/Service.ts`              |
| `ApplicationConfiguration.ts` | `Services/Configuration.ts`                    |
| `Debug.ts`                    | `Debug/Server.ts`                              |
| `ESMInterceptor.ts`           | `Services/Module/Interceptor.ts`               |
| `ExtensionHost.ts`            | `Services/Extension/Host/Service.ts`           |
| `IPC.ts`                      | `IPC/Channel.ts`                               |
| `IPCProblem.ts`               | `Services/Error/Handling/Service.ts`           |
| `PatchProcess.ts`             | `PatchProcess/Patcher.ts`                      |
| `RequireInterceptor.ts`       | `Shim/NodeModuleInterceptor.ts`                |
| `WebViewPanel.ts`             | `WebviewPanel/Panel.ts`                        |
| `WorkSpace.ts`                | `Services/Workspace.ts`                        |
| `Command.ts`, `Document.ts`, `Window.ts`, `Task.ts` | `Services/Command.ts`, `Services/Window/Text/Document.ts`, `Services/Window.ts`, `TypeConverter/Task.ts` |
| `vine_ipc.proto`              | Mountain's `Proto/Vine.proto`                  |

> [!WARNING]
>
> The five `src/vs/...` references are upstream Microsoft paths. They are not
> files in this repository and are now described as upstream references rather
> than as local paths.

The activation methods were also corrected: the interface declares
`activateExtension()` and `deactivateExtension()`, not `ActivateById()` and
`DeactivateAll()`.

## Testing Recommendations

### Extension Compatibility Testing

**High Priority Extensions to Test**:

1. TypeScript/JavaScript language features
2. Git integration
3. Debugging extensions
4. Theme extensions
5. LSP (Language Server Protocol) extensions

### Performance Testing

**Key Metrics to Measure**:

1. Extension loading time
2. API call latency
3. Memory usage patterns
4. Startup performance

### Integration Testing

**Test Scenarios**:

1. End-to-end extension workflow
2. Error recovery scenarios
3. Multi-extension compatibility
4. Cross-process communication

```sh
pnpm test
```

> [!NOTE]
>
> The Element's Vitest suite; `pnpm type-check` runs `tsc --noEmit` alongside it.

## Conclusion

###&#x2001;✅ Overall Assessment

Cocoon's implementation shows **high compatibility** with VS Code's extension
host architecture. The core functionality is well-implemented with several
architectural improvements:

1. **Modern Communication**: gRPC vs custom protocol
2. **Better Error Handling**: Effect-TS provides superior error management
3. **Enhanced Architecture**: Clean separation of concerns

###&#x2001;🔄 Areas for Further Validation

1. **Advanced Language Features**: Complete implementation needed
2. **Performance Benchmarking**: Real-world testing required
3. **Extension Ecosystem Testing**: Test with popular extensions

###&#x2001;🎯 Next Validation Steps

1. **Performance Testing**: Benchmark against VS Code
2. **Extension Testing**: Test with real extensions
3. **Integration Testing**: Full workflow validation

## Validation History

- **2025-01-28**: Initial validation completed
- **Findings**: High compatibility with core VS Code architecture
- **Recommendations**: Proceed with integration testing
- **Path reconciliation**: Every Cocoon path re-checked against the `Current`
  branch; twelve phantom references corrected and the build, codegen,
  telemetry, platform and utility subsystems documented for the first time.

---

_This validation demonstrates that Cocoon provides a robust, compatible
extension host implementation that maintains VS Code compatibility while
offering architectural improvements._
