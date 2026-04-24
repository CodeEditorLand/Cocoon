# Route Manifest - coverage report

_Generated 2026-04-24T22:37:41Z_

## Totals

| Tier | Count | Source |
|---|---:|---|
| 1 - Mountain (Rust) | 80 | `Track/Effect/CreateEffectForRequest/*.rs` |
| 2 - Stock VS Code | 21 | `StockLift.ts` |
| 3 - Cocoon bespoke | 1 | `*Fallback.ts` |

## Tier 1 methods (Mountain-handled)

- `$disposeStatusBarMessage`
- `$gitExec`
- `$languageFeatures:registerProvider`
- `$resolveCustomEditor`
- `$scm:createSourceControl`
- `$scm:registerInputBox`
- `$scm:updateGroup`
- `$scm:updateSourceControl`
- `$setStatusBarMessage`
- `$statusBar:dispose`
- `$statusBar:set`
- `$terminal:create`
- `$terminal:dispose`
- `$terminal:resize`
- `$terminal:sendText`
- `$tree:register`
- `$updateWorkspaceFolders`
- `applyEdit`
- `Authentication.GetAccounts`
- `Authentication.GetSession`
- `Clipboard.Read`
- `Clipboard.Write`
- `Command.Execute`
- `Command.GetAll`
- `config.get`
- `config.update`
- `Configuration.Inspect`
- `Configuration.Update`
- `Debug.RegisterConfigurationProvider`
- `Debug.Start`
- `Debug.Stop`
- `Diagnostic.Clear`
- `Diagnostic.Set`
- `Document.Save`
- `Document.SaveAs`
- `error`
- `executeCommand`
- `FileSystem.Copy`
- `FileSystem.CreateDirectory`
- `FileSystem.Delete`
- `FileSystem.ReadDirectory`
- `FileSystem.ReadFile`
- `FileSystem.Rename`
- `FileSystem.Stat`
- `FileSystem.WriteFile`
- `FileWatcher.Register`
- `FileWatcher.Unregister`
- `findFiles`
- `findTextInFiles`
- `Keybinding.GetResolved`
- `Languages.GetAll`
- `NativeHost.OpenExternal`
- `openDocument`
- `readFile`
- `Search.TextSearch`
- `secrets.delete`
- `secrets.get`
- `secrets.store`
- `showTextDocument`
- `stat`
- `Storage.Get`
- `Storage.Set`
- `Task.Execute`
- `Task.Fetch`
- `Terminal.GetProcessId`
- `Terminal.Resize`
- `tree.dispose`
- `tree.register`
- `tree.unregister`
- `UserInterface.ShowInputBox`
- `UserInterface.ShowMessage`
- `UserInterface.ShowOpenDialog`
- `UserInterface.ShowQuickPick`
- `UserInterface.ShowSaveDialog`
- `warning`
- `Window.ShowInputBox`
- `Window.ShowMessage`
- `Window.ShowOpenDialog`
- `Window.ShowQuickPick`
- `Window.ShowSaveDialog`

## Tier 2 exports (stock VS Code lifted)

- `StockLift.Basename`
- `StockLift.Dirname`
- `StockLift.Extname`
- `StockLift.GlobIsEmpty`
- `StockLift.GlobMatch`
- `StockLift.GlobParsePattern`
- `StockLift.IsEqualOrParent`
- `StockLift.JoinPath`
- `StockLift.RelativePath`
- `StockLift.StockBasename`
- `StockLift.StockDirname`
- `StockLift.StockExtname`
- `StockLift.StockGlobIsEmpty`
- `StockLift.StockGlobMatch`
- `StockLift.StockGlobParse`
- `StockLift.StockIsEqualOrParent`
- `StockLift.StockJoinPath`
- `StockLift.StockRelativePath`
- `StockLift.ToUri`
- `StockLift.Uri`
- `StockLift.URI`

## Tier 3 exports (Cocoon bespoke Node)

- `FindTextInFilesNodeFallback`

## Progressive migration hint

- Methods that appear in tiers 2 or 3 but NOT in tier 1 are
  candidates to re-implement in Mountain Rust for performance.
- Hand-rolled tier-3 functions are candidates to replace with
  stock-VS-Code lifts (tier 2) if a pure stock equivalent exists.
- The `dual-track` dev-log tag at runtime shows which tier
  each real dispatch took. Compare against this manifest to
  find mismatches (e.g. manifest says tier 1 but dispatch took
  tier 3 - manifest is stale, rerun this script).
