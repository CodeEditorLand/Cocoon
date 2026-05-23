# Route Manifest - coverage report

_Generated 2026-05-23T07:00:26Z_

## Totals

| Tier | Count | Source |
|---|---:|---|
| 1 - Mountain (Rust) | 135 | `Track/Effect/CreateEffectForRequest/*.rs` |
| 2 - Stock VS Code | 0 | `StockLift.ts` |
| 3 - Cocoon bespoke | 1 | `*Fallback.ts` |

## Tier 1 methods (Mountain-handled)

- `$disposeStatusBarMessage`
- `$gitExec`
- `$resolveCustomEditor`
- `$scm:createSourceControl`
- `$scm:openDiff`
- `$scm:registerInputBox`
- `$scm:updateGroup`
- `$scm:updateSourceControl`
- `$setStatusBarMessage`
- `$statusBar:dispose`
- `$statusBar:set`
- `$terminal:create`
- `$terminal:dispose`
- `$terminal:hide`
- `$terminal:resize`
- `$terminal:sendText`
- `$terminal:show`
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
- `html`
- `Keybinding.GetResolved`
- `Languages.GetAll`
- `message`
- `NativeHost.OpenExternal`
- `openDocument`
- `postMessage`
- `readFile`
- `register_call_hierarchy_provider`
- `register_code_actions_provider`
- `register_code_lens_provider`
- `register_color_provider`
- `register_completion_item_provider`
- `register_declaration_provider`
- `register_definition_provider`
- `register_document_drop_edit_provider`
- `register_document_formatting_provider`
- `register_document_highlight_provider`
- `register_document_link_provider`
- `register_document_paste_edit_provider`
- `register_document_range_formatting_provider`
- `register_document_symbol_provider`
- `register_evaluatable_expression_provider`
- `register_folding_range_provider`
- `register_hover_provider`
- `register_implementation_provider`
- `register_inlay_hints_provider`
- `register_inline_completion_item_provider`
- `register_inline_edit_provider`
- `register_inline_values_provider`
- `register_linked_editing_range_provider`
- `register_mapped_edits_provider`
- `register_multi_document_highlight_provider`
- `register_on_type_formatting_provider`
- `register_reference_provider`
- `register_rename_provider`
- `register_selection_range_provider`
- `register_semantic_tokens_provider`
- `register_signature_help_provider`
- `register_type_definition_provider`
- `register_type_hierarchy_provider`
- `register_workspace_symbol_provider`
- `saveAll`
- `Search.TextSearch`
- `secrets.delete`
- `secrets.get`
- `secrets.store`
- `setHtml`
- `showTextDocument`
- `stat`
- `Storage.Get`
- `Storage.Set`
- `Task.Execute`
- `Task.Fetch`
- `Terminal.GetProcessId`
- `Terminal.Hide`
- `Terminal.Resize`
- `Terminal.Show`
- `tree.dispose`
- `tree.register`
- `tree.unregister`
- `UserInterface.ShowInputBox`
- `UserInterface.ShowMessage`
- `UserInterface.ShowOpenDialog`
- `UserInterface.ShowQuickPick`
- `UserInterface.ShowSaveDialog`
- `viewId`
- `vscode.diff`
- `warning`
- `webview.postMessage`
- `webview.registerView`
- `webview.setHtml`
- `webview.unregisterView`
- `window.revealRange`
- `Window.ShowInputBox`
- `Window.ShowMessage`
- `Window.ShowOpenDialog`
- `Window.ShowQuickPick`
- `Window.ShowSaveDialog`
- `Workspace.IsResourceTrusted`
- `Workspace.RequestResourceTrust`
- `Workspace.Save`
- `Workspace.SaveAll`
- `Workspace.SaveAs`

## Tier 2 exports (stock VS Code lifted)

_none_

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
