# Cocoon Source Refactoring Strategy

## Advanced Batch File Separation & Standardization

**Date**: 2025-01-28  
**Status**: Planning Phase  
**Scope**: Element/Cocoon/Source directory  
**Repository**: [CodeEditorLand/Cocoon](https://github.com/CodeEditorLand/Cocoon/tree/Current/) (branch `Current`)

> [!IMPORTANT]
>
> This is a historical planning document, and much of it has since shipped. The
> tables under "Refactoring Strategy by Category" record the tree as it stood on
> 2025-01-28; the "Reconciliation Against The Tree Today" section maps every one
> of those claims onto the file that exists now.

---

## Executive Summary

This document outlines a comprehensive refactoring strategy for the
`Element/Cocoon/Source` directory to achieve:

- **1 file, 1 export** with nameless `export default`
- **Standardized Naming Convention**: PascalCase, single-word, action-oriented,
  present tense, singular
- **Deduplication** using most complete implementations
- **Comprehensive Documentation** with JSDoc/TypeDoc and @module tags
- **VSCode Integration** validated against
  Dependency/Microsoft/Dependency/Editor/src
- **Effect-TS Best Practices** referenced from Documentation/Module/effect

> [!NOTE]
>
> The VSCode reference tree resolves at `Land/Dependency/Microsoft/Dependency/Editor/src`,
> one level above this Element, not inside `Element/Cocoon`.

---

## Refactoring Principles

### 1. File Structure Standards

#### Principle: Single Responsibility per File

- Each file contains exactly **one export**
- Export should be **nameless**: `export default Implementation`
- Prefer **function exports**: `export default (Args) => { ... }`
- For complex implementations: `export default class Implementation { ... }`

#### Naming Convention Rules

- **PascalCase**: First letter of each word capitalized
- **Single-word**: No underscores or hyphens (use PascalCase instead)
- **Action-oriented**: Name what it _does_, not what it _is_
- **Present tense**: Current action (e.g., `Activate` not `Activated`)
- **Singular form**: One entity (e.g., `Extension` not `Extensions`)

**Examples:**

```
❌ Bad: extension_host_service.ts
❌ Bad: loadExtensions.ts
✅ Good: Extension.ts
✅ Good: Activate.ts
✅ Good: RegisterCommand.ts
```

> [!NOTE]
>
> The block contrasts rejected snake_case and camelCase file names against the
> PascalCase single-word form the convention requires.

---

## Current Structure Analysis

### Directory: `Element/Cocoon/Source`

The listing below is the 2025-01-28 record, preserved verbatim as the baseline
the plan was written against:

```
Source/
├── ServiceMapping.ts (220 lines) - ORCHESTRATOR - Multiple exports
├── Run.sh (Build script)
├── prepublishOnly.sh (Build script)
├── ApplicationConfiguration/
├── Bootstrap/
├── Cancellation/
├── Clipboard/
├── Configuration/
├── Debug/
├── Dialog/
├── Effect/ (Effect-TS services) ✅ Already follows patterns
├── Generated/
├── IPC/
├── Integration/
├── Interfaces/
├── NodeModuleShim/
├── PatchProcess/
├── Platform/
├── Scripts/
├── Services/ (OLD-STYLE services) - NEED MAJOR REFACTOR
├── TypeConverter/
├── Utility/
└── WebviewPanel/
```

> [!WARNING]
>
> Seven entries in that snapshot no longer exist: `ApplicationConfiguration/`,
> `Cancellation/`, `Clipboard/`, `Dialog/`, `Effect/`, `Generated/` and
> `NodeModuleShim/`; `Run.sh` and `prepublishOnly.sh` are still present.

### Reconciliation Against The Tree Today

Every path the original plan named still resolves, but five of them moved. The
old identifier survives in each destination's `@module` tag, which is why the
names below remain searchable.

| Documented As              | Actual Path Today                                                                                                                            | Surviving `@module`        | Lines |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----- |
| `Effect/ModuleInterceptor` | [`Source/Service/Effect/Module/Interceptor.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Module/Interceptor.ts) | `Effect/ModuleInterceptor` | 703   |
| `Effect/MountainClient`    | [`Source/Service/Effect/Mountain/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Mountain/Client.ts)       | `Effect/MountainClient`    | 576   |
| `Services/APIFactory`      | [`Source/Services/API/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts)           | `APIFactoryService`        | 944   |
| `Services/ExtensionContext` | [`Source/Services/Extension/Context.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Context.ts)              | `ExtensionContext`         | 702   |
| `Services/ExtensionHostService` | [`Source/Services/Extension/Host/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts) | `ExtensionHostService`     | 326   |
| ServiceMapping.ts          | [`Source/Service/Mapping.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts)                                    | `ServiceMapping`           | 54    |

The orchestrator shrank rather than split. `Service/Mapping.ts` now exposes a
plain-object registry - `composeAppLayer()` returning `telemetry`, `health`,
`mountainClient`, `moduleInterceptor`, `extension`, `rpcServer` and `bootstrap`
as live singletons, with no Layer or pipe machinery.

> [!NOTE]
>
> The 220-line multi-export orchestrator the plan flagged is now 54 lines, so the
> "ORCHESTRATOR - Multiple exports" concern is resolved.

### Runtime Spine&#x2001;⚙️

Cocoon boots as a Node process, patches module resolution before any extension
code runs, then talks to Mountain over IPC.

| Unit             | Source                                                                                                                                          | Role                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `Bootstrap`      | [`Source/Bootstrap`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap)                                                     | Process entry; installs the interceptor before the first import.            |
| `Implementation` | [`Source/Bootstrap/Implementation/Cocoon/Main.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/Implementation/Cocoon/Main.ts) | Concrete `Main` bootstrap; calls `installNodeModuleInterceptor()` first. |
| `WebSocket`      | [`Source/Bootstrap/WebSocket/Server.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/WebSocket/Server.ts)             | WebSocket transport served by the bootstrap.                                |
| `Shim`           | [`Source/Shim/NodeModuleInterceptor.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim/NodeModuleInterceptor.ts)             | Patches `Module._load` to route `fs` and `child_process` through Mountain.  |
| `IPC`            | [`Source/IPC/Protocol.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Protocol.ts)                                         | Request, response and notification contract mirroring VSCode IPC.           |
| `Message`        | [`Source/IPC/Message/Serialize/Message.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Message/Serialize/Message.ts)       | Framing: serialize, deserialize, batch, unbatch, `VSBuffer`.                |
| `Type`           | [`Source/IPC/Type/Converter.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Type/Converter.ts)                             | DTO converters such as `WindowStateDTO` and `DocumentStateDTO`.             |

The shim is tier-gated: `installNodeModuleInterceptor()` is a no-op when
`TierShim` is `None`, and esbuild removes the whole module at build time.
`IPC/Handler.ts` exports `IPCHandler` and `CreateIPCHandler` for registration,
async execution and cancellation.

> [!NOTE]
>
> Bootstrap ordering is load-bearing - the interceptor import must execute
> synchronously above every other import in `Main.ts`.

### Service Registry And Effect Layer&#x2001;🧩

| Unit        | Source                                                                                                                                | Role                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Service`   | [`Source/Service/Mapping.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts)                           | Lean singleton registry; `composeAppLayer()` returns every live service. |
| `Effect`    | [`Source/Service/Effect`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect)                                   | The Effect-TS service family and its barrel.                             |
| `Module`    | [`Source/Service/Effect/Module/Interceptor.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Module/Interceptor.ts) | Effect-side module interception.                                 |
| `Mountain`  | [`Source/Service/Effect/Mountain/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Mountain/Client.ts) | Effect-side Mountain client.                                        |
| `Telemetry` | [`Source/Telemetry/OTLPBridge.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/OTLPBridge.ts)                 | OTLP bridge for exported spans and metrics.                              |
| `PostHog`   | [`Source/Telemetry/PostHog/Transport.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/PostHog/Transport.ts)   | Buffer, configuration, event, identifier and transport.                  |
| `Post`      | [`Source/Telemetry/Post/Hog/Bridge.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/Post/Hog/Bridge.ts)       | Bridge binding the PostHog transport to the telemetry service.           |

> [!NOTE]
>
> `Service/Effect/index.ts` is the barrel the registry imports from, which is why
> Category A keeps it rather than splitting it.

### Services Layer&#x2001;🔌

This is the `vscode` API surface. Each namespace is backed by a service that
either answers locally or forwards to Mountain.

| Unit                | Source                                                                                                                                    | Role                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `API`               | [`Source/Services/API/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts)     | Builds the `vscode` object handed to each extension.                        |
| `Extension`         | [`Source/Services/Extension/Host/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts) | Extension lifecycle: interception plus API injection.                   |
| `Extensions`        | [`Source/Services/Extensions/Scanner.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extensions/Scanner.ts)       | Scanner facade replacing the hand-built registry.                           |
| `Window`            | [`Source/Services/Window/Index.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Index.ts)                   | Composition point wiring every window sub-module.                           |
| `Workspace`         | [`Source/Services/Workspace.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Workspace.ts)                         | Backs `vscode.workspace`; delegates reads to Mountain.                      |
| `Handler`           | [`Source/Services/Handler`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler)                                   | Inbound request routing and the `VscodeAPI` namespace handlers.             |
| `Language`          | [`Source/Services/Language/Provider/Registry.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Language/Provider/Registry.ts) | Maps numeric handles to provider objects.                         |
| `gRPC`              | [`Source/Services/gRPC/Server/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/gRPC/Server/Service.ts)     | Serves Mountain's `CocoonService` protocol from [Vine.proto](https://github.com/CodeEditorLand/Mountain/tree/Current/Proto/Vine.proto). |
| `Mountain`          | [`Source/Services/Mountain/Client/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Mountain/Client/Service.ts) | Outbound client, default `localhost:50051`.                             |
| `File`              | [`Source/Services/File/System/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/File/System/Service.ts)     | FileSystem API mapping `file://` onto Mountain's FS spine.                  |
| `Error`             | [`Source/Services/Error/Handling/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Error/Handling/Service.ts) | Circuit breaker with `CLOSED`, `OPEN` and `HALF_OPEN` states.             |
| `Dual`              | [`Source/Services/Dual/Track.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dual/Track.ts)                       | Tries Mountain first, falls back to Node on unknown-method errors.          |
| `Echo`              | [`Source/Services/Echo/Action/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Echo/Action/Client.ts)       | Bidirectional EchoAction channel with the Mountain spine.                   |
| `Dev`               | [`Source/Services/Dev/Log.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dev/Log.ts)                             | Tag-filtered logger mirroring Mountain's `dev_log!` macro.                  |
| `Init`              | [`Source/Services/Init/Data.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Init/Data.ts)                         | Host initialization payload: commit, version, `parentPid`.                  |
| `Metrics`           | [`Source/Services/Metrics/Collector.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Metrics/Collector.ts)         | Counter map exposing `Record`, `Get` and `GetAll`.                          |
| `Security`          | [`Source/Services/Security/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Security/Service.ts)           | Policy enforcement, audit logging and incident response.                    |
| `Performance`       | [`Source/Services/Performance/Monitoring/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Performance/Monitoring/Service.ts) | Runtime performance monitoring.                          |
| `Terminal`          | [`Source/Services/Terminal/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Terminal/Service.ts)           | Marked dead: `TerminalServiceLayer` has no importers.                       |
| `ModuleInterceptor` | [`Source/Services/ModuleInterceptor/Index.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/ModuleInterceptor/Index.ts) | Interceptor entry retaining the original module name.                   |

`Services/Window.ts` is now a 19-line re-export shim over
[`Source/Services/Window`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window),
which already holds `Dialog.ts`, `Progress.ts`, `State.ts`,
`Output/Channel.ts`, `Quick/Input.ts`, `Status/Bar.ts`, `Text/Document.ts` and
`Webview/Panel.ts`. The split proposed below therefore landed, under different
file names.

> [!WARNING]
>
> `Services/Terminal/Service.ts` carries a deprecation notice dated 2026-05-26:
> its commented wire calls never matched a Mountain handler.

### Build, Codegen And Diagnostics&#x2001;🛠️

| Unit          | Source                                                                                                                                | Role                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `Codegen`     | [`Source/Codegen/Codegen.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Codegen.ts)                           | Runnable entry; exits non-zero on any `CodegenProblem`.               |
| `Run`         | [`Source/Codegen/Run/Ext/Host/Codegen.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Run/Ext/Host/Codegen.ts) | `RunExtHostCodegen`, the pipeline driver.                             |
| `Extract`     | [`Source/Codegen/Extract/Is/Ext/Host/File.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Extract/Is/Ext/Host/File.ts) | `IsExtHostFile` narrows the walk to `vs/workbench/api`.       |
| `Emit`        | [`Source/Codegen/Emit/Emit/Ext/Host/Schema.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Emit/Emit/Ext/Host/Schema.ts) | `EmitExtHostSchema`; idempotent, byte-identical re-runs.    |
| `Configuration` | [`Source/Configuration/Mountain/Config.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/Mountain/Config.ts) | Mountain-side build configuration.                                |
| `ESBuild`     | [`Source/Configuration/ESBuild/Target.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild/Target.ts) | Base, bootstrap, compile and target configs.                          |
| `Scripts`     | [`Source/Scripts/PerformanceBenchmark.js`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Scripts/PerformanceBenchmark.js) | Standalone benchmark harness.                                         |
| `Debug`       | [`Source/Debug/Server.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug/Server.ts)                                 | Node half of the dual-layer inspection HTTP surface.                  |
| `Integration` | [`Source/Integration/Mountain/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration/Mountain/Client.ts)   | Convenience wrapper over `MountainClientService`.                     |
| `PatchProcess` | [`Source/PatchProcess/Patcher.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Patcher.ts)                | Process hardening: loader, patcher, security, validator.              |

The root build entries [`Source/ESBuild.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.ts)
and its compiled twin [`Source/ESBuild.js`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.js)
export `Clean`, `Meta` and `On`, reading `Clean`, `Meta`, `NODE_ENV` and
`TAURI_ENV_DEBUG` from the environment. `Run.sh` and `prepublishOnly.sh` remain
the two shell entry points, and `prepublishOnly.sh` is what invokes `Codegen`.

> [!NOTE]
>
> Cocoon's codegen reuses Wind's extractors verbatim; only the file predicate and
> the emit destination differ.

### Platform, Utility And Interfaces&#x2001;📐

| Unit           | Source                                                                                                                                 | Role                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Platform`     | [`Source/Platform/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Service.ts)                          | `IPlatformService` over OS, environment and process.             |
| `VSCode`       | [`Source/Platform/VSCode/Type.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/VSCode/Type.ts)                  | Shared VS Code type surface for the platform layer.              |
| `Utility`      | [`Source/Utility/Result.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Result.ts)                              | `Result` with `Ok`, `Err`, `IsOk` and `IsErr`.                   |
| `Event`        | [`Source/Utility/Event/Stream.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Event/Stream.ts)                  | `CreateEventStream` bridging the VS Code Event API.              |
| `Glob`         | [`Source/Utility/Glob/To/Regex.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Glob/To/Regex.ts)                | `GlobToRegex`, shared by `findFiles` and `languages.match`.      |
| `Land`         | [`Source/Utility/Land/Fix/Log.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Land/Fix/Log.ts)                  | `[LandFix:...]` logger that survives `drop: ["console"]`.        |
| `Interfaces`   | [`Source/Interfaces/IAPIFactory.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPIFactory.ts)              | Interface root; keeps the `I` prefix convention.                 |
| `I`            | [`Source/Interfaces/I/Mountain/Client/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/I/Mountain/Client/Service.ts) | Per-service interface tree under `Interfaces/I`.   |
| `IAPI`         | [`Source/Interfaces/IAPI/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPI/Factory/Service.ts) | `IAPIFactoryService` contract for API construction.          |
| `IGRPC`        | [`Source/Interfaces/IGRPC/Server/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IGRPC/Server/Service.ts) | `IGRPCServerService`, based on the Vine protocol.            |
| `TypeConverter` | [`Source/TypeConverter/Command.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Command.ts)               | Marshals VS Code types across the process boundary.              |
| `Main`         | [`Source/TypeConverter/Main/URI.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Main/URI.ts)              | URI, range, text edit, markdown and view column.                 |
| `Dialog`       | [`Source/TypeConverter/Dialog/Filter.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Dialog/Filter.ts)    | Dialog filters and results.                                      |
| `Quick`        | [`Source/TypeConverter/Quick/Input.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Quick/Input.ts)        | Quick pick and input box payloads.                               |
| `Status`       | [`Source/TypeConverter/Status/Bar.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Status/Bar.ts)          | Status bar item conversion.                                      |
| `TreeView`     | [`Source/TypeConverter/TreeView/Item.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/TreeView/Item.ts)    | Tree items and tree view options.                                |
| `Webview`      | [`Source/TypeConverter/Webview`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Webview)                      | Panel, show and content option DTOs.                             |
| `WebviewPanel` | [`Source/WebviewPanel/Panel.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Panel.ts)                      | Panel factory, messaging, serializer and state.                  |

> [!NOTE]
>
> `Utility/Tier.ts` resolves the tier flags - `TierRemoteProcedureCallValue`,
> `TierHTTPProxyValue`, `TierLoggerValue` - that decide which implementation runs.

---

## Refactoring Strategy by Category

### Category A: Effect/ Services&#x2001;✅ ALREADY GOOD

These services already follow the established patterns well. Just need
refinement.

**Files:** `Effect/*.ts`

| Current File                | Lines | Status  | Action               |
| --------------------------- | ----- | ------- | -------------------- |
| `Effect/Bootstrap.ts`       | 370   | ✅ Good | Refine documentation |
| `Effect/Extension.ts`       | ~300  | ✅ Good | Refine documentation |
| `Effect/Health.ts`          | 320   | ✅ Good | Refine documentation |
| `Effect/ModuleInterceptor`  | ~250  | ✅ Good | Refine documentation |
| `Effect/MountainClient`     | 528   | ✅ Good | Refine documentation |
| `Effect/RPCServer.ts`       | ~400  | ✅ Good | Refine documentation |
| `Effect/Telemetry.ts`       | 405   | ✅ Good | Refine documentation |
| `Effect/index.ts`           | 113   | ✅ Good | Keep as barrel       |

Those line counts are the 2025-01-28 estimates. Measured today the family is
larger: Bootstrap 634, Extension 494, Health 356, RPCServer 476, Telemetry 277,
the barrel 112, and the two relocated modules 703 and 576.

**Action Items:**

1. Ensure each service exports nameless default where appropriate
2. Add comprehensive @module documentation with links
3. Verify Effect-TS patterns match documentation
4. Cross-reference with VSCode extHost patterns

---

### Category B: Services/ (OLD-STYLE) - HIGH PRIORITY SPLIT

**Current Files:** `Services/*.ts`

| Current File                    | Lines | Status       | Action     | Split Strategy         |
| ------------------------------- | ----- | ------------ | ---------- | ---------------------- |
| `Services/APIFactory`           | 1394  | ⚠️ Too Large | Split      | 8 separate files       |
| `Services/Command.ts`           | 534   | ⚠️ Too Large | Split      | 5 separate files       |
| `Services/Configuration.ts`     | 637   | ⚠️ Too Large | Split      | 4 separate files       |
| `Services/Extension.ts`         | ~300  | ⚠️ Mixed     | Refine     | Move to Extension/ dir |
| `Services/ExtensionHostService` | 192   | ⚠️ Mixed     | Split/Move | Extension/Activate.ts  |
| `Services/Window.ts`            | 1498  | ⚠️ Massive   | Split      | 10 separate files      |
| `Services/Workspace.ts`         | 720   | ⚠️ Large     | Split      | 6 separate files       |
| `Services/ExtensionContext`     | ~100  | ✅ OK        | Move       | Extension/Context.ts   |
| `Services/Logger.ts`            | ~200  | ✅ OK        | Move       | Utility/Logger.ts      |
| `Services/Health.ts`            | ~150  | ✅ Dup       | Remove     | Use Effect/Health.ts   |

Measured today: Command 550, Configuration 771, Extension 719, Workspace 1121,
Logger 331 and Health 908. Two rows are already done - `Services/Extension.ts`
gained its `Extension/` directory, and the context builder sits at
[`Source/Services/Extension/Context.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Context.ts)
at 702 lines rather than the estimated 100.

> [!WARNING]
>
> The `Services/Health.ts` deduplication has not happened. It is 908 lines and
> still coexists with `Effect/Health.ts`, so the "✅ Dup / Remove" row is the
> oldest open item in this table.

---

### Priority Split Targets

#### 1. `Services/APIFactory.ts` → Split Into:

```
CreateAPI.ts - Main factory function
InjectCommand.ts - Command API injection
InjectWindow.ts - Window API injection
InjectWorkspace.ts - Workspace API injection
InjectExtensions.ts - Extension API injection
InjectLanguages.ts - Language API injection
InjectDebug.ts - Debug API injection
ValidateAPI.ts - API validation logic
```

> [!NOTE]
>
> Shipped differently: the factory stayed whole at 944 lines and the per-namespace
> injection moved to `Services/Handler/VscodeAPI/*/Namespace.ts` instead.

#### 2. `Services/Window.ts` → Split Into:

```
Window/ShowMessage.ts - Information/warning/error messages
Window/ShowQuickPick.ts - Quick pick UI
Window/ShowInputBox.ts - Input box UI
Window/ShowDialog.ts - File open/save dialogs
Window/CreateStatusBar.ts - Status bar items
Window/CreateOutputChannel.ts - Output channels
Window/CreateWebview.ts - Webview panels
Window/ShowProgress.ts - Progress indicators
Window/ShowTextDocument.ts - Text document display
Window/State.ts - Window state management
```

> [!NOTE]
>
> Shipped, renamed: the ten targets exist as `Dialog.ts`, `Progress.ts`,
> `State.ts`, `Output/Channel.ts`, `Quick/Input.ts` and their siblings.

#### 3. `Services/Command.ts` → Split Into:

```
Command/Register.ts - Command registration
Command/Execute.ts - Command execution
Command/Get.ts - Get command by ID
Command/Unregister.ts - Command unregistration
Command/Validate.ts - Command validation
```

> [!NOTE]
>
> Still open at 550 lines; the equivalent routing now lives in
> `Services/Handler/VscodeAPI/Commands/Route.ts`.

#### 4. `Services/Workspace.ts` → Split Into:

```
Workspace/GetConfiguration.ts - Configuration access
Workspace/OpenTextDocument.ts - Document operations
Workspace/ApplyEdit.ts - Workspace edits
Workspace/FindFiles.ts - File search
Workspace/FindTextInFiles.ts - Text search
Workspace/SaveAll.ts - Save operations
Workspace/State.ts - Workspace state
```

> [!NOTE]
>
> Still open at 1121 lines, and now the largest single file in the tree.

#### 5. `Services/Configuration.ts` → Split Into:

```
Configuration/Get.ts - Get configuration values
Configuration/Update.ts - Update configuration
Configuration/Scope.ts - Configuration scope management
Configuration/Events.ts - Configuration change events
```

> [!NOTE]
>
> Still open at 771 lines; note that top-level `Configuration/` is the build
> configuration directory, so the split needs a different destination name.

---

### Category C: Interfaces/ - NEED STANDARDIZATION

**Current Files:** `Interfaces/*.ts`

| Current File        | Status        | Action              | Notes                      |
| ------------------- | ------------- | ------------------- | -------------------------- |
| `Interfaces/I*.ts`  | Keep I prefix | Standardize         | Keep TypeScript convention |
| All interface files | ✅ OK         | Add `@module` block | Document with TypeDoc tags |

The prefix convention held. Contracts live under `Interfaces/I` one directory
per service, with `IAPI` and `IGRPC` kept separate because they describe wire
surfaces rather than in-process services.

> [!NOTE]
>
> `Interfaces/IAPIFactory.ts` exports both an interface and a
> `Symbol.for("IAPIFactory")` token, so the name is a value as well as a type.
