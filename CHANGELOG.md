# Changelog - Cocoon

Cocoon is our extension-host sidecar - the Node.js process Mountain spawns to
run VS Code extensions through our Effect-TS-driven `vscode` API shim. This file
records what we built in our voice, version by version. Format adapted from
[Keep a Changelog](https://keepachangelog.com/).

## [v2.2] - Bundled-Electron Profile: Correctness Pass

We brought Cocoon to parity with the bundled workbench profile. Everything in
this section was about making sure events and shapes the workbench reaches for
actually arrive.

### Added

- **Parent-PID watchdog** in `Bootstrap/Implementation/CocoonMain.ts`. Polls
  `process.kill(ppid, 0)` every 2 s and self-exits with code 130 on `ESRCH`.
  When the host is force-quit we no longer orphan and require the next boot's
  port-sweep band-aid.
- **`-32004` benign-404 classification** in `Services/MountainClientService.ts`
  (RPC-error path + catch path) and
  `Services/Handler/VscodeAPI/WorkspaceNamespace/FileSystemNamespace.ts`. We
  honour the JSON-RPC code first; the regex stays as a fallback for older
  Mountain builds. Classifier matches `no such file or directory`,
  `entity not found`, `os error 2`,
  `path is outside of the registered workspace`,
  `permission denied for operation`, and `workspace is not trusted`.
- **`FileWatcher.Register` benign classifier**: a watcher install on an absent
  path no longer counts against the breaker.

### Fixed

- **`BuildOpenTextDocument` now decodes Mountain's `Vec<u8>` body** to a UTF-8
  string and exposes the full `TextDocument` API (`positionAt`, `offsetAt`,
  `lineAt`, `getWordRangeAtPosition`, `validateRange`, `validatePosition`). The
  npm extension's `readScripts` calls `positionAt` once per script entry; it was
  throwing `is not a function`, which `getScripts` wrapped as a user-visible
  "failed to parse the file" error. We pre-compute line-start offsets in the
  shim and binary-search in `positionAt`.

## [v2.1] - Full Workbench Lift, Effect-TS Namespace Split

We split the monolithic gRPC handler and `vscode` API shim into focused
namespaces, then taught each one how to register, route, and forward what its
extensions need.

### Added

- **`GRPCServerService` split into 7 handlers** under `Services/Handler/`:
  `HandlerContext.ts`, `ExtensionHostHandler.ts`, `LanguageProviderHandler.ts`,
  `DocumentContentHandler.ts`, `NotificationHandler.ts`,
  `RequestRoutingHandler.ts`. Each owns one axis of the inbound gRPC stream so
  adding a method or fixing a routing bug stays scoped.
- **`vscode` API split into 10 namespaces** under `Services/Handler/VscodeAPI/`:
  `WindowNamespace.ts`, `WorkspaceNamespace.ts`, `LanguagesNamespace.ts` (27
  `register*Provider` methods sharing a single `RegisterProvider` helper),
  `CommandsNamespace.ts`, `DebugNamespace.ts`, `TasksNamespace.ts`,
  `ScmNamespace.ts`, `AuthenticationNamespace.ts`, `ExtensionsNamespace.ts`,
  `EnvNamespace.ts`. We also wrapped each namespace in an Effect-TS heuristic
  Proxy so any future API the workbench reaches for that we haven't shimmed
  surfaces as an audit log line under `[VSCODE-API-GAP]` instead of a
  `TypeError` that crashes the host. Classifier infers the right shape from the
  property name: `requestResourceTrust` → `true`, `onDid…` → noop disposable,
  `register…` → disposable, `is…`/`has…`/`should…` → `false`,
  `create…`/`get…`/`make…` → `undefined`.
- **Workspace events** via `WorkspaceEventEmitter`: `didOpenTextDocument`,
  `didChangeTextDocument`, `didCloseTextDocument`, `didSaveTextDocument`.
- **`DocumentContentHandler`**: `BuildTextDocument()` with 35+ language
  identifier mappings, document version tracking, `HandleDocumentSave()`.
- **Extension storage, secrets, and window messaging** wired to Mountain (~221
  lines added to `GRPCServerService`).
- **Bidirectional language-provider sync** with Mountain (~116 lines):
  registration round-trips so the workbench sees the same provider list Cocoon
  does.
- **Platform abstraction layer** under `Source/Platform/`: `Environment.ts`,
  `Logger.ts`, `OS.ts`, `Process.ts`, `Service.ts`, `TypeConverter.ts`.
  Decouples cross-platform paths and process primitives from the Effect-TS
  layers above.
- **`MetricsCollector`, `InitData`, `LanguageProviderRegistry`, `Result` monad**
  as the supporting infrastructure for the namespace split.

### Fixed

- **`executeCommand` field-name** correction so command dispatch reaches
  Mountain's command registry.
- **Document-state parsing refinement** so an extension reading the same buffer
  the workbench paints sees consistent revisions.

## [v2.0] - Editor Launch (Effect-TS Rewrite)

The Effect-TS rewrite quarter. We took Cocoon from a hand-rolled imperative
bootstrap to a layered runtime where every async boundary is structured.

### Added (core migration)

- **7 Effect-TS service layers** in `Source/Effect/` (~2,325 lines):
    - `Bootstrap.ts` (343 lines) - 6-stage startup orchestration.
    - `Extension.ts` (415 lines) - extension lifecycle via `SubscriptionRef`.
    - `Health.ts` (266 lines) - periodic health checks and service status.
    - `MountainClient.ts` (433 lines) - gRPC client with retry logic.
    - `RPCServer.ts` (397 lines) - gRPC server for inbound Mountain requests.
    - `Telemetry.ts` (375 lines) - unified logging, metrics, span
      instrumentation.
    - `index.ts` (96 lines) - `Layer.compose` exports.
- **`Services/MountainGRPCClient.ts`** (1,206 lines) - typed wrappers for all
  70+ RPCs, every method using `(request, callback) → Promise.wrap → Effect`.
- **`Services/Adapters/CocoonGrpcAdapter.ts`** (119 lines) - bidirectional gRPC
  bridge in the Spine-Adapter pattern.
- **`Services/Window/`** (5 files): `Dialog.ts` (84), `Errors.ts` (174),
  `State.ts` (82), `Types.ts` (216), `index.ts` (27).
- **`Services/TerminalService.ts`** (68 lines), **`FileSystemService.ts`** (86
  lines).
- **`Effect/ModuleInterceptor.ts`** (493 lines) - security sandboxing for
  `require('vscode')` and friends.
- **`Services/EchoActionClient.ts`** (530 lines) - bidirectional action dispatch
  into the Echo scheduler.
- **`Generated/Vine.ts`** (693 lines) - proto-loader generated types.
- **`Scripts/compile-grpc-protocol.js`** (263 lines) - proto-compile helper.
- **13 service interfaces** in `Interfaces/`: `IAPIFactory`,
  `IAPIFactoryService`, `IConfigurationService`, `IErrorHandlingService`,
  `IExtensionHostService`, `IFileSystemService`, `IGRPCServerService`,
  `IIPCService`, `IModuleInterceptor`, `IMountainClientService`,
  `IPerformanceMonitoringService`, `ISecurityService`, `ITerminalService`.

### Changed

- **`CocoonMain.ts`** migrated from imperative init to Effect-TS declarative
  layers - each layer composes via `Layer.effect()` and `Context.Tag`.
- **`ServiceMapping.ts`** reorganised into `OldStyleServices` and
  `EffectServices` namespaces so the migration could land incrementally.
- Effect 3.19.13 → 3.21.0, `@effect/platform` 0.94.0 → 0.96.0, Vitest 4.1+ added
  for testing.

## [v1.3] - Dependency Maintenance

We rolled Effect 3.18.1 → 3.19.14 and `@effect/platform` 0.92.1 → 0.94.1,
brought `@effect/opentelemetry` to 0.58.0 → 0.60.0 in preparation for tracing,
and added `google-protobuf` 4.0.1 as the gRPC proto runtime. No new source files
this cycle - just stabilising the dep set.

## [v1.2] - Full-Stack Integration

We added `Source/IPC/` with `Generated.ts` (gRPC stubs) and the
`ProtoConverter/{DecodeValue,EncodeValue}.ts` pair. We also did a 177-file
structural reorganisation. Effect 3.16.10 → 3.18.1, `@effect/platform` 0.87.1 →
0.92.1, `@effect/platform-node` 0.88.3 → 0.98.2.

## [v1.1] - Architecture Buildout (Cocoon born from scratch)

The first quarter Cocoon existed - roughly 400 commits and ~33k lines landed.

### Added

- **Core service files** for the surface the workbench would call into:
  `APIDeprecation.ts`, `APIFactory.ts`, `Command.ts` (301 lines),
  `Authentication.ts` (116 lines), `Dialog.ts`, `Message.ts`, `Storage.ts`,
  `TreeView.ts`, `WebViewPanel.ts`, `Telemetry.ts`.
- **Tauri integration** under `Integration/Tauri/`: `Clipboard/Wrapper.ts`,
  `File/ParseJson.ts`, `File/ReadRawFile.ts`, `Path/Default.ts`,
  `Path/WorkSpace.ts`.
- **`TypeConverter` layer**: `TypeConverter/Command.ts`, `Main/Range.ts`,
  `Main/TextEdit.ts`, `Main/URI.ts`, `Dialog/OpenDialogOption.ts`,
  `Dialog/SaveDialogOption.ts`, `Task.ts`.
- **Mountain handshake** - our first gRPC integration end-to-end.
- **`Skeleton/L1.ts`** (166 lines) for Layer-1 init.

### First-release dependencies

- Effect 3.16.10, `@effect/platform` 0.87.1, `@effect/platform-node` 0.88.3,
  `@types/node` 24.0.8.
