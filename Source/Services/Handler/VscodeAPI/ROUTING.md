# Cocoon VscodeAPI tier-split routing

Every Cocoon `vscode.*` namespace shim owns a **routing decision** for
each operation: does the work happen locally in Cocoon's Node runtime
(Tier A), does it fire a local effect plus a Mountain notification
(Tier B), or does it round-trip to Mountain over gRPC (Tier C)?

The decision is extracted into a dedicated `<Namespace>Route.ts` file
per namespace, keeping the dispatch logic in `<Namespace>Namespace.ts`
short and single-responsibility.

## Tier definitions

| Tier | Backend | Latency | When |
|------|---------|---------|------|
| **A** | Cocoon `node:fs`, `node:net`, local JS state | ~0.1-0.3 ms | Operation touches no Mountain-owned state and uses a primitive Node provides |
| **B** | Cocoon-local + Mountain notification | ~0.5-2 ms | Mutation whose effect Mountain needs to know about (workspace folders, active document, scm state) - the op returns from the local side, the notify fires fire-and-forget |
| **C** | `MountainClient.sendRequest(method, args)` over gRPC | ~3-15 ms | Operation requires Mountain-owned state: UI, command registry, a scheme claimed by a Mountain FS provider, a custom extension provider Cocoon doesn't hold |

Tier choice is **per-operation**, driven by the `Route(args)` function in
the namespace's `Route.ts` module. Routes are pure functions (no Mountain
RTT to make the decision). `[DEV:<NAMESPACE>-ROUTE]` log lines make
every dispatch observable.

## Env-driven tier overrides

Tier values are resolved via `Utility/Tier.ts` from two sources in
precedence order:

1. `globalThis.__LandTiers.<Capability>` - populated by esbuild's
   `__LandTier_<Capability>__` define substitutions at build time
   (values sourced from `.env.Land` by `Maintain/Script/TierEnvironment.sh`).
2. `process.env.Tier<Capability>` - runtime fallback for Cocoon runs
   that bypass Maintain (pnpm dev scripts, tests).

For example, `TierFileSystem` governs `FileSystemRoute.Route`:

- `TierFileSystem=Layer2` → every fs op routes to Mountain. Use when
  Cocoon is intentionally fs-sandboxed (debug-mountain-only profile).
- `TierFileSystem=Layer3` (default) → scheme-based split. `file://`
  with no custom provider uses Node; everything else Mountain.
- `TierFileSystem=Layer4` → preferred-native split. Extension-claimed
  schemes still route to Mountain (correctness), but file URIs fall
  back to `.path` if `fsPath` is missing.

Override per-run by exporting before launch:

```bash
export TierFileSystem=Layer4
./Maintain/Debug/Build.sh --profile debug-electron
```

The chosen tier is logged on Cocoon boot by `Utility/Tier.ts`'s single
banner: `[DEV:TIER] Cocoon tier set resolved: {"FileSystem":"Layer3", …}`.

## Landed routers

| Namespace | Route module | Dev-log tag |
|-----------|-------------|-------------|
| `workspace.fs.*`, `workspace.openTextDocument` | `WorkspaceNamespace/FileSystemRoute.ts` | `fs-route` |
| `commands.executeCommand` | `CommandsRoute.ts` | `cmd-route` |

## Adding a new router

1. Create `<Namespace>Route.ts` next to the Namespace file. Export a
   `Route` type, a `Route()` function (pure), and a `LogRoute()`
   helper that honours `LAND_DEV_LOG`.
2. Import it in the corresponding `<Namespace>Namespace.ts`. Call
   `Route(args)` once per dispatch, `LogRoute(decision)` for the
   diagnostic line, then branch on the decision.
3. If the decision is driven by a new capability flag, extend
   `Utility/Tier.ts` with a new `Tier<Capability>Value` type + `Pick`
   entry, mirror into `Element/Wind/Source/Utility/Tier.ts`, add the
   default value in `.env.Land.Sample`, and declare it in
   `Element/Mountain/build.rs::IsDeclaredTierFeature` if Rust cares
   about it.
4. Document the tag in `Element/Mountain/Source/IPC/DevLog.rs` so
   `LAND_DEV_LOG=…` autocompletes know about it.
5. Reference the new router in the "Landed routers" table above.

## Why not split every namespace at once

Each router is small but the behavioural assumptions vary:

- `window.*` is ~95% Mountain-owned (UI state); few Tier A wins
- `debug.*` is Mountain-owned entirely (debug service is native)
- `scm.*` is Tier B everywhere (local state + notify)
- `terminal.*` depends on the pty backend; bigger refactor

Router extraction is additive - add them opportunistically as each
namespace sees a behavioural change that needs the observability or the
Tier override. The FS + Commands pair carries ~80% of the hot-path
traffic on a typical extension activation; the remaining namespaces are
lower-impact and should be routed only when the problem they solve is
actually in scope.
