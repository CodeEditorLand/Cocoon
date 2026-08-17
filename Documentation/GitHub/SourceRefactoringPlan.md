# Cocoon Source Refactoring Plan

## Advanced Batch File Separation & Standardization

### Executive Summary

This document is the internal architecture reference for the
[`Source`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source)
tree of Cocoon, Land's Node.js extension host. It records the module
boundaries that exist today, the data flow between them, and the
refactoring strategy that is still outstanding.

The plan drives the tree toward six outcomes:

- **1 file, 1 export** with nameless `export default`
- **Standardized Naming Convention**: PascalCase, single-word, action-oriented,
  present tense, singular
- **Deduplication** using most complete implementations
- **Comprehensive Documentation** with JSDoc/TypeDoc and @module tags
- **VSCode Integration** validated against
  Dependency/Microsoft/Dependency/Editor/src
- **Effect-TS Best Practices** referenced from Documentation/Module/effect

> [!IMPORTANT]
>
> This revision reconciles the document against the tree on disk. Six paths
> it previously named do not exist; every one is corrected below under
> Reconciled Path Corrections, and no path is asserted here that the tree
> does not contain.

---

## Refactoring Principles

### 1. File Structure Standards

#### Principle: Single Responsibility per File

- Each file contains exactly **one export**
- Export should be **nameless**: `export default SomeImplementation`
- Prefer **function exports**: `export default () => { ... }`
- For complex implementations: `export default class SomeClass { ... }`

#### Naming Convention Rules

- **PascalCase**: First letter of each word capitalized
- **Single-word**: No underscores or hyphens (use PascalCase instead)
- **Action-oriented**: Name what it _does_, not what it _is_
- **Present tense**: Current action (e.g., `Load` not `Loaded`)
- **Singular form**: One entity (e.g., `Extension` not `Extensions`)

**Examples:**

```
❌ Bad: extension_host_service.ts
❌ Bad: loadExtensions.ts
✅ Good: Extension.ts
✅ Good: Activate.ts
✅ Good: RegisterCommand.ts
```

The convention is already honoured by the newest modules. `Register`,
`Unregister`, `Get` and `ExecuteCommand` in the language provider registry
are the reference shape:

**`Source/Services/Language/Provider/Registry.ts`**

    export function Register(Handle: number, Provider: ProviderObject): void {
    export function Unregister(Handle: number): void {
    export function Get(Handle: number): ProviderObject | undefined {
    export function RegisterAutoHandle(Provider: ProviderObject): number {

> [!NOTE]
>
> Every exported name is a present-tense verb, which is what the naming rule
> above asks for.

---

## Current Structure Analysis

### Directory: `Element/Cocoon/Source`

The block below is the tree as this document originally recorded it. It is
retained verbatim because it is the baseline the refactor is measured
against, but it is **no longer accurate** - read it as history, and read
Reconciled Path Corrections for the tree that exists now.

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
├── Effect/ (Effect-TS services)
├── Generated/
├── IPC/
├── Integration/
├── Interfaces/
├── NodeModuleShim/
├── PatchProcess/
├── Platform/
├── Scripts/
├── Services/ (OLD-STYLE services)
├── TypeConverter/
├── Utility/
├── WebviewPanel/
```

### Reconciled Path Corrections

Six paths named elsewhere in this document do not exist on disk. Each row
gives the real location.

| Claimed path | Reality in the tree | Correct path |
| --- | --- | --- |
| `Effect/ModuleInterceptor.ts` | Effect services live under `Service/Effect/`, and this one is split by word | [`Source/Service/Effect/Module/Interceptor.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Module/Interceptor.ts) |
| `Effect/MountainClient.ts` | Same relocation, same word split | [`Source/Service/Effect/Mountain/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Mountain/Client.ts) |
| `Services/APIFactory.ts` | Already split into a directory; 944 lines, not 1394 | [`Source/Services/API/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts) |
| `Services/ExtensionHostService.ts` | Split into a directory; 326 lines, not 192 | [`Source/Services/Extension/Host/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts) |
| `Services/ExtensionContext.ts` | Split into a directory; 702 lines | [`Source/Services/Extension/Context.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Context.ts) |
| `Extension/Activate.ts` | Never existed; it was a proposed target name, not a file | no such file - the host lives at [`Source/Services/Extension/Host/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts) |

Two further claims in the tree block above are also stale:

- ServiceMapping.ts is now [`Source/Service/Mapping.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Mapping.ts) and is **54 lines**, not 220. It is no longer an orchestrator with sprawling exports; it is a lean singleton registry.
- `ApplicationConfiguration/`, `Cancellation/`, `Clipboard/`, `Dialog/`, `Generated/` and `NodeModuleShim/` are not present at the top level. `Dialog` survives one level down as [`Source/TypeConverter/Dialog`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Dialog); the module shim survives as [`Source/Shim`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim).

**`Source/Service/Mapping.ts`**

    composeAppLayer: () => ({
        telemetry: TelemetryLive,
        health: HealthLive,
        mountainClient: MountainClientLive,

> [!NOTE]
>
> The registry hands back already-initialised singletons, so there is no Layer or `provide` machinery to unwind.

### Top-Level Units Present Today

| Unit | Role |
| --- | --- |
| [`Bootstrap`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap) | Process entry and the Sky transport listener |
| [`Codegen`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen) | Emits extension-host schemas from VS Code source |
| [`Configuration`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration) | Build and Mountain connection settings |
| [`Debug`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug) | The Cocoon half of the dual-layer inspection server |
| [`ESBuild.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.ts) / [`ESBuild.js`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.js) | Bundler options, authored and compiled |
| [`IPC`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC) | Channels, protocol, message framing |
| [`Integration`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration) | High-level Mountain client wrapper |
| [`Interfaces`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces) | Service contracts, no implementations |
| [`PatchProcess`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess) | Process hardening before any extension activates |
| [`Platform`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform) | OS, environment, process and dotfile-root abstraction |
| [`Scripts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Scripts) | Benchmark harness |
| [`Service`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service) | Effect-TS services and the singleton registry |
| [`Services`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services) | The VS Code API surface implementations |
| [`Shim`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim) | `Module._load` interception |
| [`Telemetry`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry) | OTLP and PostHog exporters |
| [`TypeConverter`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter) | VS Code type to DTO marshalling |
| [`Utility`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility) | Tier gating, events, globs, results, logging |
| [`WebviewPanel`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel) | Webview lifecycle and state |
| [`Run.sh`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Run.sh) / [`prepublishOnly.sh`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/prepublishOnly.sh) | Development and publish build scripts |

---

## Refactoring Strategy by Category

### Category A: Effect-TS Services (HIGH PRIORITY)

**Current Files:** `Effect/*.ts`

These now live under
[`Source/Service/Effect`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect).
The table keeps its original assessment; the New Name Pattern column is the
proposal as written, and the real on-disk path follows underneath.

| Current File                  | Status      | Action | New Name Pattern              | Notes                    |
| ----------------------------- | ----------- | ------ | ----------------------------- | ------------------------ |
| `Effect/Bootstrap.ts`         | ✅ Good     | Refine | `Effect/Bootstrap.ts`         | Already follows patterns |
| `Effect/Extension.ts`         | ✅ Good     | Refine | `Effect/Extension.ts`         | Already follows patterns |
| `Effect/Health.ts`            | ✅ Good     | Refine | `Effect/Health.ts`            | Already follows patterns |
| `Effect/ModuleInterceptor.ts` | ✅ Good     | Refine | `Effect/ModuleInterceptor.ts` | Already follows patterns |
| `Effect/MountainClient.ts`    | ✅ Good     | Refine | `Effect/MountainClient.ts`    | Already follows patterns |
| `Effect/RPCServer.ts`         | ✅ Good     | Refine | `Effect/RPCServer.ts`         | Already follows patterns |
| `Effect/Telemetry.ts`         | ✅ Good     | Refine | `Effect/Telemetry.ts`         | Already follows patterns |
| `Effect/index.ts`             | ❌ Multiple | Split  | Keep as barrel                | Export aggregator only   |

Real locations and sizes, verified against the tree:

| Service | Path | Lines |
| --- | --- | --- |
| Bootstrap | [`Service/Effect/Bootstrap.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Bootstrap.ts) | 634 |
| Extension | [`Service/Effect/Extension.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Extension.ts) | 494 |
| Health | [`Service/Effect/Health.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Health.ts) | 356 |
| Module Interceptor | [`Service/Effect/Module/Interceptor.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Module/Interceptor.ts) | 703 |
| Mountain Client | [`Service/Effect/Mountain/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Mountain/Client.ts) | 576 |
| RPC Server | [`Service/Effect/RPCServer.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/RPCServer.ts) | 476 |
| Telemetry | [`Service/Effect/Telemetry.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/Telemetry.ts) | 277 |
| Barrel | [`Service/Effect/index.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Service/Effect/index.ts) | 112 |

**`Source/Service/Effect/Module/Interceptor.ts`**

     * @module Effect/ModuleInterceptor
     * Atomic module interceptor service for Cocoon Extension Host.
     * Provides AST-based security sandboxing and module isolation for extensions.

> [!NOTE]
>
> The `@module` tag still spells the old flat name, which is why the audit read the path as `Effect/ModuleInterceptor.ts`.

**Refactoring Actions:**

1. Ensure each service file exports nameless default
2. Add comprehensive @module documentation
3. Verify Effect-TS patterns match documentation
4. Cross-reference with VSCode extHost patterns

---

### Category B: Services (OLD-STYLE - NEED MAJOR REFACTOR)

**Current Files:** `Services/*.ts`

| Current File                       | Status     | Action | New Name Pattern        | Notes                          |
| ---------------------------------- | ---------- | ------ | ----------------------- | ------------------------------ |
| `Services/APIFactory.ts`           | ⚠️ Mixed   | Split  | Multiple files          | 1394 lines - too large         |
| `Services/Command.ts`              | ⚠️ Mixed   | Split  | Multiple files          | 534 lines - multiple concerns  |
| `Services/Configuration.ts`        | ⚠️ Mixed   | Split  | Multiple files          | 637 lines - multiple concerns  |
| `Services/Extension.ts`            | ⚠️ Mixed   | Split  | Multiple files          | Review needed                  |
| `Services/ExtensionHostService.ts` | ⚠️ Mixed   | Refine | `Extension/Activate.ts` | 192 lines                      |
| `Services/Window.ts`               | ⚠️ Massive | Split  | Multiple files          | 1498 lines - needs major split |
| `Services/Workspace.ts`            | ⚠️ Large   | Split  | Multiple files          | 720 lines - needs split        |
| `Services/ExtensionContext.ts`     | ✅ OK      | Refine | `Extension/Context.ts`  | Single concern                 |
| `Services/Logger.ts`               | ✅ OK      | Refine | `Logger.ts`             | Move to Utility/               |
| `Services/Health.ts`               | ✅ OK      | Refine | `Health.ts`             | Move to Utility/               |

#### Progress Against That Table

Several of those splits have already happened, and the line counts have
moved. Measured on disk:

| Module | Path | Lines | State |
| --- | --- | --- | --- |
| API Factory | [`Services/API/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts) | 944 | Split into a directory; still large |
| Command | [`Services/Command.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Command.ts) | 550 | Not yet split |
| Configuration | [`Services/Configuration.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Configuration.ts) | 771 | Not yet split; grew |
| Extension | [`Services/Extension.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension.ts) | 719 | Not yet split |
| Extension Host | [`Services/Extension/Host/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Host/Service.ts) | 326 | Split done |
| Window | [`Services/Window.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window.ts) | 19 | **Split complete** - now a re-export shim |
| Workspace | [`Services/Workspace.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Workspace.ts) | 1121 | Not split; grew past the estimate |
| Extension Context | [`Services/Extension/Context.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extension/Context.ts) | 702 | Moved, not yet thinned |
| Logger | [`Services/Logger.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Logger.ts) | 331 | Still under `Services/`, move to `Utility/` outstanding |
| Health | [`Services/Health.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Health.ts) | 908 | Still under `Services/`, move outstanding |

**`Source/Services/Window.ts`**

     * Re-export shim - implementation has been split into Window/ directory.
    export { default } from "./Window/Index.js";
    export { WindowService, Logger, Window, Workspace, VSCodeWindowAPI } from "./Window/Index.js";

> [!NOTE]
>
> The 1498-line file is gone; what remains is a nineteen-line compatibility shim, so old import paths keep resolving.

#### Priority Split Targets

**`Services/APIFactory.ts` → Split Into:**

```
CreateAPI.ts - Main factory function
InjectCommand.ts - Command API injection
InjectWindow.ts - Window API injection
InjectWorkspace.ts - Workspace API injection
InjectExtensions.ts - Extension API injection
InjectLanguages.ts - Language API injection
ValidateAPI.ts - API validation logic
```

**`Services/Window.ts` → Split Into:**

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

The realised split differs in file naming - it groups by noun rather than
by verb - but covers the same surface:
[`Window/Dialog.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Dialog.ts),
[`Window/Progress.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Progress.ts),
[`Window/State.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/State.ts),
[`Window/Quick/Input.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Quick/Input.ts),
[`Window/Status/Bar.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Status/Bar.ts),
[`Window/Output/Channel.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Output/Channel.ts),
[`Window/Webview/Panel.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Webview/Panel.ts),
[`Window/Text/Document.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/Text/Document.ts) and
[`Window/File/Dialogs.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Window/File/Dialogs.ts).

**`Services/Command.ts` → Split Into:**

```
Command/Register.ts - Command registration
Command/Execute.ts - Command execution
Command/Get.ts - Get command by ID
Command/Unregister.ts - Command unregistration
Command/Validate.ts - Command validation
```

**`Services/Workspace.ts` → Split Into:**

```
Workspace/GetConfiguration.ts - Configuration access
Workspace/OpenTextDocument.ts - Document operations
Workspace/ApplyEdit.ts - Workspace edits
Workspace/FindFiles.ts - File search
Workspace/SaveAll.ts - Save operations
Workspace/State.ts - Workspace state
```

---

### Category C: Interfaces (NEED STANDARDIZATION)

**Current Files:** the
[`Interfaces`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces)
tree. This section was truncated mid-sentence in the previous revision; it
is completed here from the tree.

Interfaces hold contracts only - no implementation, no runtime behaviour.
Three naming families coexist and that is the standardization debt:

| Family | Directory | Contents |
| --- | --- | --- |
| `I` | [`Interfaces/I`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/I) | Per-service contracts split by word: Configuration, Error, Extension, File, Module, Mountain, Performance, Security, Terminal |
| `IAPI` | [`Interfaces/IAPI`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPI) | The VS Code API factory contract at `Factory/Service.ts` |
| `IGRPC` | [`Interfaces/IGRPC`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IGRPC) | The gRPC server contract at `Server/Service.ts` |

A fourth form, the flat [`Interfaces/IAPIFactory.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPIFactory.ts),
duplicates the `IAPI/Factory/Service.ts` concept and is the clearest
deduplication target in this category.

**`Source/Interfaces/IGRPC/Server/Service.ts`**

     * Interface for Cocoon's gRPC server service.
     * Responsible for handling Mountain gRPC requests and notifications.
    export interface IGRPCServerService {

> [!NOTE]
>
> A contract file declares the interface and its symbol, and imports no implementation.

---

## Subsystem Reference

This section documents the parts of the tree the refactoring tables do not
reach. Each entry is a real module, verified on disk.

### Bootstrap and Process Entry

#### Bootstrap

[`Bootstrap/Implementation/Cocoon/Main.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/Implementation/Cocoon/Main.ts)
is the process entry point. Ordering is load-bearing: the module
interceptor must be installed before any extension code can reach `fs`.

**`Source/Bootstrap/Implementation/Cocoon/Main.ts`**

    import installNodeModuleInterceptor from "../../../Shim/NodeModuleInterceptor.js";
    installNodeModuleInterceptor();
    // Import Tier dispatcher *after* __LandTiers is populated.
    import "../../../Utility/Tier.js";

> [!NOTE]
>
> The interceptor call sits above every other import because `Module._load` must be patched before the first extension `require`.

#### WebSocket

[`Bootstrap/WebSocket/Server.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Bootstrap/WebSocket/Server.ts)
is a JSON-RPC WebSocket server providing the direct Sky-to-Cocoon
transport. It authenticates a shared secret supplied by URL query,
`Sec-WebSocket-Protocol`, or an `X-Land-Secret` header.

#### Implementation

`Implementation` is the directory layer under `Bootstrap` that holds the
per-target entry module; today it contains only the `Cocoon` target. A
second target would sit beside it rather than branch inside `Main.ts`.

### Module Interception and Hardening

#### Shim

[`Shim/NodeModuleInterceptor.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Shim/NodeModuleInterceptor.ts)
(1202 lines) patches Node's `Module._load` to route `fs` and
`child_process` through Mountain's native layer.

**`Source/Shim/NodeModuleInterceptor.ts`**

    export default function installNodeModuleInterceptor(): void {

> [!NOTE]
>
> When `TierShim` is `None` - the default - the function is a no-op and esbuild tree-shakes the whole module out of the bundle.

#### PatchProcess

[`PatchProcess`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess)
hardens the process before any extension activates, so that
`process.exit`, `process.crash`, uncaught exceptions and
`Module._load("natives")` all hit a policy rather than the raw runtime. It
splits into [`Patcher.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Patcher.ts)
(orchestrator), [`Loader.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Loader.ts),
[`Security.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Security.ts) and
[`Validator.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Validator.ts).

**`Source/PatchProcess/Patcher.ts`**

    export const RunPatchProcess = async function() {
    export const ReloadSecurityPolicy = async function() {

> [!NOTE]
>
> `ReloadSecurityPolicy` exists so a policy change does not require restarting the extension host.

#### Module and ModuleInterceptor

Two `Services` directories carry the interception concern:
[`Services/Module/Interceptor/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Module/Interceptor/Service.ts)
holds the AST-based sandboxing implementation, while
[`Services/ModuleInterceptor`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/ModuleInterceptor)
is a barrel that documents why the class cannot be split further - AST
analysis, sandboxing, caching and telemetry are co-dependent. The pair is a
deduplication target.

### Transport and Message Flow

#### IPC

[`IPC`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC)
is the transport floor. [`Channel.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Channel.ts)
(1416 lines) manages multi-channel RPC and routing between Mountain, Wind
and Sky; [`Protocol.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Protocol.ts)
defines the request, response and notification shapes.

**`Source/IPC/Protocol.ts`**

    export function WrapMessage(message: IPCProtocolMessage): ProtocolMessage {
    export function SerializeMessage(message: ProtocolMessage): VSBuffer {
    export function DeserializeMessage(buffer: VSBuffer): ProtocolMessage {

> [!NOTE]
>
> Every message crosses the wire as a `VSBuffer`, the same framing primitive VS Code's own IPC uses.

#### Message

[`IPC/Message`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Message)
is the completed form of the split this plan asks for elsewhere: one
concern per file - `Serialize/Message.ts`, `Deserialize/Message.ts`,
`Batch/Messages.ts`, `Unbatch/Messages.ts`, `Validation.ts`, `VSBuffer.ts`,
`Constants.ts` and `Utility.ts` - with
[`IPC/Message.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Message.ts)
left behind as a re-export barrel so existing imports keep resolving. It is
the reference pattern for Category B.

#### Handler

[`Services/Handler`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler)
is the largest subsystem in the tree and the one the refactoring tables
never mention. It routes inbound requests to the VS Code API surface:
[`Request/Routing/Handler.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/Request/Routing/Handler.ts)
(934 lines) dispatches, `Notification/Handler.ts` handles fire-and-forget
traffic, and `VscodeAPI/` holds one namespace module per `vscode.*`
namespace - Commands, Window, Workspace, Languages, Debug, Env,
Extensions, Scm, Tasks, Tests, Comments and Authentication. Its
[`ROUTING.md`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Handler/VscodeAPI/ROUTING.md)
documents the dispatch table.

#### gRPC

[`Services/gRPC/Server/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/gRPC/Server/Service.ts)
implements the CocoonService protocol from Mountain's Vine specification,
with bidirectional streaming for real-time events.
[`Services/Mountain/gRPC/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Mountain/gRPC/Client.ts)
is marked a dead layer in its own header - exported but never provided -
and is a removal candidate.

#### Echo

[`Services/Echo/Action/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Echo/Action/Client.ts)
provides bidirectional EchoAction communication with Mountain Spine.

**`Source/Services/Echo/Action/Client.ts`**

    export class CocoonEchoClient {
    export type EchoActionType =
    export const CocoonEchoClientFactory = {

> [!NOTE]
>
> The client is Node-only; it requires the Cocoon extension host and has no browser path.

#### Dual

[`Services/Dual/Track.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dual/Track.ts)
(553 lines) is the progressive-migration backstop. Extensions expect the
complete `vscode.*` surface, but Mountain implements it in Rust one method
at a time, so every shim call tries Mountain first and falls back to Node
when Mountain answers "unknown method".

**`Source/Services/Dual/Track.ts`**

    export function IsUnknownMethodError(Err: unknown): boolean {
    export async function TryMountainThenNode<T>(
    export function MarkUnavailable(Method: string): never {

> [!NOTE]
>
> `TryMountainThenNode` is the single decision point where a call falls back, which keeps the migration state in one file.

### Services Support Modules

| Module | Path | What it does |
| --- | --- | --- |
| **API** | [`Services/API/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts) | Builds the complete `vscode` API object, scoped per extension |
| **Dev** | [`Services/Dev/Log.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Dev/Log.ts) | Tag-filtered logger mirroring Mountain's `dev_log!` macro |
| **Error** | [`Services/Error/Handling/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Error/Handling/Service.ts) | Circuit breaker, retry with exponential backoff |
| **Extensions** | [`Services/Extensions/Scanner.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Extensions/Scanner.ts) | Extension discovery facade |
| **File** | [`Services/File/System/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/File/System/Service.ts) | VS Code FileSystem API over the Universal Spine |
| **Init** | [`Services/Init/Data.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Init/Data.ts) | Extension host initialization data - commit, version, parent PID |
| **Language** | [`Services/Language/Provider/Registry.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Language/Provider/Registry.ts) | Maps numeric handles to registered provider objects |
| **Metrics** | [`Services/Metrics/Collector.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Metrics/Collector.ts) | Minimal metrics collection stub |
| **Performance** | [`Services/Performance/Monitoring/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Performance/Monitoring/Service.ts) | Zero-overhead shim; all methods are no-ops by design |
| **Security** | [`Services/Security/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Security/Service.ts) | Policy enforcement, audit logging, incident response |
| **Terminal** | [`Services/Terminal/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Terminal/Service.ts) | Marked a dead wrapper with no importers - removal candidate |
| **Mountain** | [`Services/Mountain/Client/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Mountain/Client/Service.ts) | The live Mountain client the Effect layer wraps |

**`Source/Services/Dev/Log.ts`**

    export const CocoonDevLog = (Tag: string, Message: string): void => {
        if (!IsEnabled(Tag)) return;
        process.stdout.write(`[DEV:${TagUpper}] ${Message}\n`);

> [!NOTE]
>
> Lines go to stdout with a `[DEV:<TAG>]` prefix, which Mountain captures into its own dev-log file.

### Build and Code Generation

#### Codegen

[`Codegen`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen)
walks VS Code's source tree and emits Cocoon-side schemas.
[`Codegen.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Codegen.ts)
is the runnable entry, invoked by `prepublishOnly.sh`, and exits non-zero on
any `CodegenProblem` so a bad build halts loudly.

**`Source/Codegen/Run/Ext/Host/Codegen.ts`**

    export const RunExtHostCodegen = async (
    export default RunExtHostCodegen;

> [!NOTE]
>
> The orchestrator narrows Wind's full-tree walker to the extension-host subtree before emitting.

#### Extract and Emit

The pipeline has two halves.
[`Codegen/Extract`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Extract)
identifies extension-host files and iterates their decorators;
[`Codegen/Emit`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Emit)
writes the schema files. [`Codegen/Run`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Run)
holds the orchestrator and [`Codegen/Type`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Type)
the decorator record types.

**`Source/Codegen/Emit/Emit/Ext/Host/Schema.ts`**

    export const EmitExtHostSchema = async (
    export default EmitExtHostSchema;

> [!NOTE]
>
> Emission is idempotent: re-running on an unchanged record produces byte-identical output.

#### ESBuild

[`ESBuild.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.ts)
is the authored bundler configuration and
[`ESBuild.js`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/ESBuild.js)
its compiled sibling. Both read `Clean`, `Meta` and the development flag
from the environment.

**`Source/ESBuild.ts`**

    export const Clean = process.env["Clean"] === "true";
    export const Meta = process.env["Meta"] === "true";
    export const On = process.env["NODE_ENV"] === "development" ||

> [!NOTE]
>
> `On` is the development switch that gates sourcemaps and disables console dropping.

#### Configuration

[`Configuration/ESBuild`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/ESBuild)
holds the per-target build configs - `Base`, `Bootstrap`, `Compile`,
`Target` and the environment constants - while
[`Configuration/Mountain/Config.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Configuration/Mountain/Config.ts)
carries connection settings, timeouts and retry policy for the Mountain
client.

#### Run and Scripts

[`Run.sh`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Run.sh)
is the development-mode launcher.
[`prepublishOnly.sh`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/prepublishOnly.sh)
generates the DualTrack route manifest before esbuild runs - without it the
bundle fails to resolve and the launch degrades to no-extensions mode.
[`Scripts/PerformanceBenchmark.js`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Scripts/PerformanceBenchmark.js)
exercises the services under realistic workloads.

### Platform and Diagnostics

#### Platform

[`Platform`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform)
abstracts the host: [`OS.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/OS.ts),
[`Environment.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Environment.ts),
[`Process.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Process.ts),
[`Logger.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Logger.ts)
and [`Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Service.ts),
which composes them into one Effect-TS layer.
[`FiddeeRoot.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/FiddeeRoot.ts)
resolves the user dotfile root.

**`Source/Platform/FiddeeRoot.ts`**

    export const DotfileName: string = ".fiddee";
    export default function FiddeeRoot(): string {

> [!NOTE]
>
> `~/.fiddee` holds installed extensions, recently-opened workspaces and per-extension storage.

#### VSCode

[`Platform/VSCode/Type.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/VSCode/Type.ts)
is the single source of truth for VS Code runtime type constructors. It
re-exports the compiled upstream source, so there are no hand-written
shims - every converter imports from here to guarantee one identity per
type.

#### Debug

[`Debug/Server.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Debug/Server.ts)
(412 lines) is the Node half of the dual-layer inspection surface, speaking
the same wire protocol as Mountain's Rust debug server.

**`Source/Debug/Server.ts`**

    export function Start(): number | null {
    export function Stop(): void {

> [!NOTE]
>
> The listener starts only when the `DebugServer` environment variable is `cocoon`, `c`, `eh`, `both`, `all` or `dual`, on port `DebugServerPortCocoon` (default `9934`).

#### Telemetry, Post and PostHog

[`Telemetry/OTLPBridge.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/OTLPBridge.ts)
POSTs spans to an OTLP endpoint with no SDK, batching or retry.
[`Telemetry/PostHog`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/PostHog)
holds the `Buffer`, `Configuration`, `Event`, `Identifier` and `Transport`
pieces, and [`Telemetry/Post/Hog/Bridge.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Telemetry/Post/Hog/Bridge.ts)
drains the buffer on `SIGINT`, `SIGTERM` and exit so crash events still land.

**`Source/Telemetry/OTLPBridge.ts`**

    export const TraceIdentifier = (): string => {
    export const CaptureSpan = (
    export const WithSpan = async <Result>(

> [!NOTE]
>
> `WithSpan` wraps an async operation so a span is emitted without the caller handling identifiers.

### Type Conversion and UI

#### TypeConverter, Main, Dialog, Quick, Status, TreeView, Webview

[`TypeConverter`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter)
marshals VS Code objects to DTOs and back.
[`Main`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Main)
holds the core types - `URI`, `Range`, `Text/Edit`, `Markdown/String`,
`View/Column`, `Workspace/Folder` - and the remaining directories cover one
API family each: [`Dialog`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Dialog)
(open, save and filter options),
[`Quick`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Quick),
[`Status`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Status),
[`TreeView`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/TreeView),
[`Webview`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Webview) and
[`Workspace`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/TypeConverter/Workspace).

**`Source/TypeConverter/Main/URI.ts`**

    export const FromAPI = (TheURI: VSCodeURI): UriComponents => TheURI.toJSON();
    export const ToAPI = (DTO: UriComponents): VSCodeURI => URI.revive(DTO);

> [!NOTE]
>
> `FromAPI` and `ToAPI` are the naming pair every converter module in this tree follows.

#### WebviewPanel

[`WebviewPanel`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel)
owns webview lifecycle: [`Factory.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Factory.ts)
creates and registers panels, [`Panel.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Panel.ts)
implements create/show/hide/dispose,
[`State.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/State.ts)
persists state across sessions,
[`Serializer.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Serializer.ts)
converts that state to Mountain DTOs, and
[`Webview/Implementation.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Webview/Implementation.ts)
is the concrete `vscode.Webview`.

#### Type

`Type` is the recurring directory name for a module's local converters and
type declarations - it appears under
[`IPC/Type`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/IPC/Type),
[`Platform/Type`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Platform/Type),
[`PatchProcess/Type`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/PatchProcess/Type),
[`WebviewPanel/Type`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/WebviewPanel/Type) and
[`Codegen/Type`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Codegen/Type).

### Utility

#### Event, Glob, Land

| Module | Path | Purpose |
| --- | --- | --- |
| **Event** | [`Utility/Event/Stream.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Event/Stream.ts) | Hybrid emitter bridging the VS Code Event API with a plain `Set` |
| **Glob** | [`Utility/Glob/To/Regex.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Glob/To/Regex.ts) | Converts a VS Code glob to an anchored `RegExp` |
| **Land** | [`Utility/Land/Fix/Log.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Land/Fix/Log.ts) | Structured `[LandFix:...]` logger that survives `drop: ["console"]` |
| Result | [`Utility/Result.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Result.ts) | `Ok`/`Err` type for IPC handler error propagation |
| Tier | [`Utility/Tier.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Utility/Tier.ts) | Resolves Land's tier-gating flags |

**`Source/Utility/Glob/To/Regex.ts`**

    export default GlobToRegex;

> [!NOTE]
>
> Both `workspace.findFiles` and `languages.match` import this one function so pattern semantics cannot drift between them.

Tier resolution has a defined precedence, and it explains why the shim can
vanish from a build entirely:

**`Source/Utility/Tier.ts`**

     *   1. `globalThis.__LandTiers` - populated by Cocoon's bootstrap prelude
     *      from esbuild `__LandTier_<Capability>__` substitutions.
     *   2. `process.env.Tier<Capability>` - fallback for dev runs

> [!NOTE]
>
> Shipped builds read the substituted global; direct `pnpm` runs fall back to the environment variable.

#### Integration

[`Integration/Mountain/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Integration/Mountain/Client.ts)
is a convenience wrapper over `MountainClientService`, giving callers a
simplified interface for common Mountain operations rather than the raw
gRPC surface.

---

## Outstanding Work

> [!WARNING]
>
> The line counts in the Category A and Category B tables were measured
> before several splits landed. Re-measure before planning a split; three
> of the ten Category B rows are already done and one - `Services/Window.ts`
> - is now a 19-line shim.

Ranked by remaining value:

1. **Split [`Services/Workspace.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Workspace.ts)** - 1121 lines and growing; the largest single file left. Follow the `IPC/Message` pattern: one concern per file plus a re-export barrel.
2. **Split [`Services/API/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/API/Factory/Service.ts)** - 944 lines; the injection targets are already enumerated above.
3. **Thin [`Services/Health.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Health.ts)** - 908 lines, and it still needs the move to `Utility/`.
4. **Delete the dead layers** - [`Services/Terminal/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Terminal/Service.ts) and [`Services/Mountain/gRPC/Client.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Services/Mountain/gRPC/Client.ts) both declare themselves unreferenced in their own headers.
5. **Deduplicate the interface families** - fold [`Interfaces/IAPIFactory.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPIFactory.ts) into [`Interfaces/IAPI/Factory/Service.ts`](https://github.com/CodeEditorLand/Cocoon/tree/Current/Source/Interfaces/IAPI/Factory/Service.ts), and the same for the two `Module/Interceptor` contracts.
6. **Update the `@module` tags** - several still name the pre-split flat path, which is what made this document's paths look wrong in the first place.
