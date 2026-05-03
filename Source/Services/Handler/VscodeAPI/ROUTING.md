# Cocoon VscodeAPI tier-split routing

Every Cocoon `vscode.*` namespace shim owns a **routing decision** for each
operation: does the work happen locally in Cocoon's Node runtime (Tier A), does
it fire a local effect plus a Mountain notification (Tier B), or does it
round-trip to Mountain over gRPC (Tier C)?

The decision is extracted into a dedicated `<Namespace>Route.ts` file per
namespace, keeping the dispatch logic in `<Namespace>Namespace.ts` short and
single-responsibility.

## Tier definitions

| Tier  | Backend                                              | Latency     | When                                                                                                                                                                      |
| ----- | ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Cocoon `node:fs`, `node:net`, local JS state         | ~0.1-0.3 ms | Operation touches no Mountain-owned state and uses a primitive Node provides                                                                                              |
| **B** | Cocoon-local + Mountain notification                 | ~0.5-2 ms   | Mutation whose effect Mountain needs to know about (workspace folders, active document, scm state) - the op returns from the local side, the notify fires fire-and-forget |
| **C** | `MountainClient.sendRequest(method, args)` over gRPC | ~3-15 ms    | Operation requires Mountain-owned state: UI, command registry, a scheme claimed by a Mountain FS provider, a custom extension provider Cocoon doesn't hold                |

Tier choice is **per-operation**, driven by the `Route(args)` function in the
namespace's `Route.ts` module. Routes are pure functions (no Mountain RTT to
make the decision). `[DEV:<NAMESPACE>-ROUTE]` log lines make every dispatch
observable.

## Env-driven tier overrides

Tier values are resolved via `Utility/Tier.ts` from two sources in precedence
order:

1. `globalThis.__LandTiers.<Capability>` - populated by esbuild's
   `__LandTier_<Capability>__` define substitutions at build time (values
   sourced from `.env.Land` by `Maintain/Script/TierEnvironment.sh`).
2. `process.env.Tier<Capability>` - runtime fallback for Cocoon runs that bypass
   Maintain (pnpm dev scripts, tests).

For example, `TierFileSystem` governs `FileSystemRoute.Route`:

- `TierFileSystem=Layer2` → every fs op routes to Mountain. Use when Cocoon is
  intentionally fs-sandboxed (debug-mountain-only profile).
- `TierFileSystem=Layer3` (default) → scheme-based split. `file://` with no
  custom provider uses Node; everything else Mountain.
- `TierFileSystem=Layer4` → preferred-native split. Extension-claimed schemes
  still route to Mountain (correctness), but file URIs fall back to `.path` if
  `fsPath` is missing.

Override per-run by exporting before launch:

```bash
export TierFileSystem=Layer4
./Maintain/Debug/Build.sh --profile debug-electron
```

The chosen tier is logged on Cocoon boot by `Utility/Tier.ts`'s single banner:
`[DEV:TIER] Cocoon tier set resolved: {"FileSystem":"Layer3", …}`.

## Landed routers

| Namespace                                      | Route module                            | Dev-log tag |
| ---------------------------------------------- | --------------------------------------- | ----------- |
| `workspace.fs.*`, `workspace.openTextDocument` | `WorkspaceNamespace/FileSystemRoute.ts` | `fs-route`  |
| `commands.executeCommand`                      | `CommandsRoute.ts`                      | `cmd-route` |

## Dual-track progressive Rust migration

`Services/DualTrack.ts` provides `TryMountainThenNode` - a second routing
pattern that's **orthogonal to tier routing above**. Tier routing decides _which
backend handles a known operation_. DualTrack handles _what happens when
Mountain doesn't know the method yet._

```ts
import { TryMountainThenNode } from "../../DualTrack.js";

findTextInFiles: async (query, options) =>
    TryMountainThenNode(
        Context,
        "Workspace.FindTextInFiles",
        [query, options],
        async ([Query, Options]) => {
            // Node fallback implementation. Runs in Cocoon when Mountain
            // returns "Unknown method: Workspace.FindTextInFiles".
            // Mountain may gain a Rust handler later - this stops being
            // invoked automatically when that happens.
            return await FindTextInFilesNodeImpl(Query, Options);
        },
    ),
```

### Why DualTrack

- **API completeness first, Rust performance second.** Every shim method that
  would otherwise be a blank stub gets a working Node implementation
  immediately. Rust handlers are written over time; each one silently bypasses
  its fallback when it ships.
- **Automatic graduation.** No coordination needed - as long as Mountain's
  `CreateEffectForRequest` recognises the method name and returns a valid value,
  the Node fallback goes quiet.
- **Observable.** `[DEV:DUAL-TRACK] method=X route=mountain|node-fallback|error`
  per dispatch. Grep the log to see which methods Mountain still doesn't cover -
  that IS the Rust TODO list.

### When DualTrack is the wrong pattern

- For Mountain-owned operations (window focus, native dialogs, SCM UI). There IS
  no Node equivalent; silent fallback to an empty result would hide a real bug.
- For operations that depend on Mountain-held state (extension registry,
  tree-view handles, terminal pty state). The Node fallback would be working on
  stale or absent state.

Use DualTrack where a stock VS Code implementation in Node is a correct-enough
fallback (search, text codec, glob, URI manipulation, language detection). Use
tier routing where the Node vs Mountain decision is a performance tradeoff on
identical semantics (fs I/O).

### Dev-log tag

`dual-track` - registered in `Mountain/Source/IPC/DevLog.rs` header table.
Enable with `Trace=dual-track` (or include in a broader set) to see which Cocoon
operations are serving as compatibility scaffolding.

## Three-tier fallback hierarchy (the "lift" pattern)

Extends DualTrack with a third tier that lifts **stock VS Code source** bundled
by Output. `Services/Handler/VscodeAPI/StockLift.ts` provides thin adapters over
`@codeeditorland/output/vs/…` imports. Every Cocoon shim method that would
otherwise need bespoke logic should first check whether stock VS Code already
implements the behaviour as a pure function; if so, lift it.

| Tier                 | Source                                                                                                                  | Why pick it                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **1. Mountain**      | Rust `Track/Effect/CreateEffectForRequest/*`                                                                            | Fastest, typed, progressive - one-off engineering cost                                     |
| **2. Stock VS Code** | `@codeeditorland/output/vs/base/common/*`, `vs/editor/common/*`, `vs/workbench/api/common/extHostTypes.js` (types only) | Correct, battle-tested, free - zero maintenance; tracks upstream when Output bumps VS Code |
| **3. Bespoke Node**  | Hand-rolled Cocoon logic                                                                                                | Last resort - only when stock can't run standalone and Mountain doesn't carry it           |

### What's safely liftable today (tier 2)

Pure functions from VS Code's `vs/base/common/` tree run standalone in Cocoon's
Node because they don't touch the `MainContext` RPC proxy or the
InstantiationService DI container:

- `vs/base/common/resources.js` - URI/path operations: `relativePath`,
  `isEqualOrParent`, `basename`, `dirname`, `extname`, `joinPath`,
  `normalizePath`, `extUri`, `extUriIgnorePathCase`, `toLocalResource`
- `vs/base/common/glob.js` - `match`, `parse`, `parsePattern`
- `vs/base/common/strings.js` - string helpers
- `vs/base/common/uri.js` - the `URI` class + `URI.parse`, `URI.file`
- `vs/base/common/buffer.js` - `VSBuffer` manipulation
- `vs/workbench/api/common/extHostTypes.js` - value classes (`Range`,
  `Position`, `Selection`, `Location`, `DiagnosticSeverity`, enums)
- `vs/editor/common/core/range.js` - `Range` math

### What's NOT in tier 2 (needs full RPC lift, future project)

Files under `vs/workbench/api/common/extHost<Namespace>.ts` (e.g.
`extHostWorkspace.ts`, `extHostCommands.ts`) run **only** inside stock VS Code's
`extensionHostProcess.ts` bootstrap because they do `this._proxy.$x(…)` into
`MainContext.MainThread<Namespace>Shape`. Lifting those requires implementing an
`RPCProtocol` that bridges to Mountain + `MainThreadShape` adapters on
Mountain's side for every namespace. That's the multi-week structural refactor
separately scoped - until it lands, those namespaces stay in tier 3 (bespoke).

### Landed stock lifts

| Cocoon method                              | Stock source                  | Lifted export               |
| ------------------------------------------ | ----------------------------- | --------------------------- |
| `workspace.asRelativePath(uri, includeWs)` | `vs/base/common/resources.js` | `StockLift.RelativePath`    |
| `workspace.getWorkspaceFolder(uri)`        | `vs/base/common/resources.js` | `StockLift.IsEqualOrParent` |

### Adding a new stock lift

1. Find the pure function in
   `Dependency/Microsoft/Dependency/Editor/src/vs/base/common/<file>.ts`.
   Confirm it doesn't reference `MainContext` / `InstantiationService` /
   `_proxy.$` / any DI-provided service.
2. Confirm it's exported by the bundled version in
   `Element/Output/Target/Microsoft/VSCode/vs/base/common/<file>.js`.
3. Add a thin wrapper to `StockLift.ts` that coerces Cocoon's unknown-typed
   inputs (plain strings, URI-like objects, real URIs) into the stock function's
   expected types, delegates, and returns.
4. Replace the hand-rolled logic in `<Namespace>Namespace.ts` with the new
   `StockLift.X(…)` call.
5. Update the "Landed stock lifts" table above.

### Composing stock with DualTrack

The three tiers compose naturally. A typical shim method now looks like:

```ts
findTextInFiles: async (query, options, callback) =>
    TryMountainThenNode(
        Context,
        "Workspace.FindTextInFiles",
        [query, options],
        async ([Q, O]) => {
            // Tier 3 → delegates to stock glob pattern matching (tier 2)
            // where possible, then Node fs.promises for the I/O.
            return FindTextInFilesNodeFallback(Context, ReadFolders(), Q, O, callback);
        },
    ),
```

The inner Node fallback is free to call `StockLift.*` wherever it would
otherwise hand-roll logic. Over time the bespoke logic inside each fallback
should shrink to an I/O shell around stock tier-2 primitives. When Mountain adds
its Rust handler for `Workspace.FindTextInFiles`, tier 1 takes over; tiers 2 + 3
go quiet automatically.

## Adding a new router

1. Create `<Namespace>Route.ts` next to the Namespace file. Export a `Route`
   type, a `Route()` function (pure), and a `LogRoute()` helper that honours
   `Trace`.
2. Import it in the corresponding `<Namespace>Namespace.ts`. Call `Route(args)`
   once per dispatch, `LogRoute(decision)` for the diagnostic line, then branch
   on the decision.
3. If the decision is driven by a new capability flag, extend `Utility/Tier.ts`
   with a new `Tier<Capability>Value` type + `Pick` entry, mirror into
   `Element/Wind/Source/Utility/Tier.ts`, add the default value in
   `.env.Land.Sample`, and declare it in
   `Element/Mountain/build.rs::IsDeclaredTierFeature` if Rust cares about it.
4. Document the tag in `Element/Mountain/Source/IPC/DevLog.rs` so `Trace=…`
   autocompletes know about it.
5. Reference the new router in the "Landed routers" table above.

## Why not split every namespace at once

Each router is small but the behavioural assumptions vary:

- `window.*` is ~95% Mountain-owned (UI state); few Tier A wins
- `debug.*` is Mountain-owned entirely (debug service is native)
- `scm.*` is Tier B everywhere (local state + notify)
- `terminal.*` depends on the pty backend; bigger refactor

Router extraction is additive - add them opportunistically as each namespace
sees a behavioural change that needs the observability or the Tier override. The
FS + Commands pair carries ~80% of the hot-path traffic on a typical extension
activation; the remaining namespaces are lower-impact and should be routed only
when the problem they solve is actually in scope.
