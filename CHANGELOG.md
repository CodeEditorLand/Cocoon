# Changelog

All notable changes to Cocoon (Extension Host) are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/).

## [v2.1] - Q2 2026: Full Workbench Lift

### Added

- GRPCServerService split into 7 handler modules under `Services/Handler/`:
  HandlerContext.ts, ExtensionHostHandler.ts, LanguageProviderHandler.ts,
  DocumentContentHandler.ts, NotificationHandler.ts, RequestRoutingHandler.ts
- ExtensionHostHandler split into 10 VscodeAPI namespace files under
  `Services/Handler/VscodeAPI/`: WindowNamespace.ts, WorkspaceNamespace.ts,
  LanguagesNamespace.ts (27 register*Provider methods with shared
  RegisterProvider helper), CommandsNamespace.ts, DebugNamespace.ts,
  TasksNamespace.ts, ScmNamespace.ts, AuthenticationNamespace.ts,
  ExtensionsNamespace.ts, EnvNamespace.ts
- Workspace events via WorkspaceEventEmitter: didOpenTextDocument,
  didChangeTextDocument, didCloseTextDocument, didSaveTextDocument
- DocumentContentHandler: BuildTextDocument() with 35+ language identifier
  mappings, document version tracking, HandleDocumentSave()
- Extension storage, secrets, and window messaging to Mountain (GRPCServerService
  +221 lines)
- Bidirectional language provider sync with Mountain (+116 lines)
- Platform abstraction layer `Source/Platform/`: Environment.ts, Logger.ts,
  OS.ts, Process.ts, Service.ts, TypeConverter.ts
- MetricsCollector, InitData, LanguageProviderRegistry, Result monad

### Fixed

- executeCommand field name correction
- Document state parsing refinement

## [v2.0] - Q1 2026: Editor Launch Sprint

**~500 commits - complete Effect-TS rewrite quarter.**

### February 7-9: Core Effect-TS Migration

#### Added

- 7 Effect-TS service layers in `Source/Effect/` (2,325 lines):
  - `Bootstrap.ts` (343 lines) - 6-stage startup orchestration
  - `Extension.ts` (415 lines) - extension lifecycle via SubscriptionRef
  - `Health.ts` (266 lines) - periodic health checks and service status
  - `MountainClient.ts` (433 lines) - gRPC client with retry logic
  - `RPCServer.ts` (397 lines) - gRPC server for Mountain requests
  - `Telemetry.ts` (375 lines) - unified logging, metrics, span instrumentation
  - `index.ts` (96 lines) - Layer composition and exports
- `Services/MountainGRPCClient.ts` (1,206 lines) - 70+ typed RPC wrappers
  with `(request, callback)` → `Promise.wrap` → Effect pattern
- `Services/Adapters/CocoonGrpcAdapter.ts` (119 lines) - bidirectional gRPC
  bridge (Spine Adapter pattern)
- `Services/Window/` (5 files): Dialog.ts (84), Errors.ts (174), State.ts
  (82), Types.ts (216), index.ts (27)
- `Services/TerminalService.ts` (68 lines)
- `Services/FileSystemService.ts` (86 lines)
- `Effect/ModuleInterceptor.ts` (493 lines) - security sandboxing
- `Services/EchoActionClient.ts` (530 lines) - bidirectional action dispatch
- `Generated/Vine.ts` (693 lines) - proto-loader generated types
- `Scripts/compile-grpc-protocol.js` (263 lines) - proto compilation
- 13 interface definitions in `Interfaces/`: IAPIFactory, IAPIFactoryService,
  IConfigurationService, IErrorHandlingService, IExtensionHostService,
  IFileSystemService, IGRPCServerService, IIPCService, IModuleInterceptor,
  IMountainClientService, IPerformanceMonitoringService, ISecurityService,
  ITerminalService

#### Changed

- CocoonMain.ts migrated from imperative init to Effect-TS declarative layers
- ServiceMapping.ts reorganized: OldStyleServices + EffectServices namespaces
- Dependency injection via `Context.Tag` and `Layer.effect()`

### March: Documentation and Formatting

#### Added

- `Documentation/GitHub/`: CocoonImplementationPlan.md,
  CocoonImplementationSummary.md, RefactoringStrategy.md,
  VsCodeValidationChecklist.md

#### Changed

- Code formatting: 37 files, 3,971 insertions, 3,053 deletions
- effect 3.19.13 → 3.21.0, @effect/platform 0.94.0 → 0.96.0
- Vitest 4.1+ added for testing

## [v1.3] - Q4 2025: Dependency Maintenance

### Changed

- effect: 3.18.1 → 3.19.14
- @effect/platform: 0.92.1 → 0.94.1
- @effect/opentelemetry: 0.58.0 → 0.60.0 (tracing preparation)
- google-protobuf 4.0.1 added (gRPC proto runtime)
- No new source files; pure dependency stabilization

## [v1.2] - Q3 2025: Full Stack Integration

### Added

- `Source/IPC/` directory: Generated.ts (gRPC stubs),
  ProtoConverter/DecodeValue.ts, EncodeValue.ts
- 177-file structural reorganization (September)

### Changed

- effect: 3.16.10 → 3.18.1
- @effect/platform: 0.87.1 → 0.92.1
- @effect/platform-node: 0.88.3 → 0.98.2

## [v1.1] - Q2 2025: Architecture Buildout

**~400 commits - Cocoon born from scratch.**

### Added (Late May - June)

- Core service files:
  - `APIDeprecation.ts` - VS Code API deprecation tracking
  - `APIFactory.ts` - VS Code API surface factory
  - `Command.ts` (301 lines) - command registration and execution
  - `Authentication.ts` (116 lines) - auth flow management
  - `Dialog.ts` - file dialogs via Tauri
  - `Message.ts` - message serialization
  - `Storage.ts` - extension storage APIs
  - `TreeView.ts` - VS Code TreeView implementation
  - `WebViewPanel.ts` - WebView panel hosting
  - `Telemetry.ts` - event tracking and metrics
- Tauri integration:
  - `Integration/Tauri/Clipboard/Wrapper.ts`
  - `Integration/Tauri/File/ParseJson.ts`, `ReadRawFile.ts`
  - `Integration/Tauri/Path/Default.ts`, `WorkSpace.ts`
- TypeConverter layer:
  - `TypeConverter/Command.ts`, `Main/Range.ts`, `Main/TextEdit.ts`,
    `Main/URI.ts`, `Dialog/OpenDialogOption.ts`, `Dialog/SaveDialogOption.ts`,
    `Task.ts`
- Mountain handshake: first gRPC integration
- `Skeleton/L1.ts` (166 lines) - Layer 1 initialization

### Dependencies (First Release)

- effect 3.16.10, @effect/platform 0.87.1, @effect/platform-node 0.88.3
- @types/node 24.0.8
