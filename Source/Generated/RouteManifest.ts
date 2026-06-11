// GENERATED FILE - do NOT edit by hand.
//
// Module:       Generated/RouteManifest
// Regenerated:  Maintain/Script/GenerateRouteManifest.sh (invoked on every build)
// Purpose:      three sets of method / function names representing the
//               four-tier routing hierarchy:
//
//   MountainMethods       tier 1. Rust handlers scanned from
//                         Element/Mountain/Source/Track/Effect/CreateEffectForRequest/<Domain>.rs
//   StockLiftExports      tier 2. Pure functions lifted from stock
//                         VS Code via Element/Cocoon/Source/Services/Handler/VscodeAPI/StockLift.ts
//   BespokeCocoonMethods  tier 3. Hand-rolled Node fallbacks
//                         discovered in files named <Method>Fallback.ts under the VscodeAPI tree.
//
// Tier 4 (unavailable) is implicit: any method not in tiers 1-3 MUST
// throw Services.DualTrack.NotImplementedError via MarkUnavailable().
//
// File uses // (line comments) rather than a TSDoc /** ... */ block
// because documentation strings that include glob patterns with the
// two-asterisk-slash sequence would prematurely close a block comment
// and break esbuild parsing (the build failure this very file caused
// on first emission).
//
// Generated: 2026-06-11T02:37:40Z

/** Mountain-side RPC method names known to have a Rust handler. */
export const MountainMethods: ReadonlySet<string> = new Set<string>(["$disposeStatusBarMessage","$gitExec","$resolveCustomEditor","$scm:createSourceControl","$scm:openDiff","$scm:registerInputBox","$scm:updateGroup","$scm:updateSourceControl","$setStatusBarMessage","$statusBar:dispose","$statusBar:set","$terminal:create","$terminal:dispose","$terminal:hide","$terminal:resize","$terminal:sendText","$terminal:show","$tree:register","$updateWorkspaceFolders","applyEdit","Authentication.GetAccounts","Authentication.GetSession","Authentication.OnSessionsChange","Clipboard.Read","Clipboard.Write","Command.Execute","Command.GetAll","config.get","config.update","Configuration.Inspect","Configuration.Update","Debug.RegisterConfigurationProvider","Debug.Start","Debug.Stop","Diagnostic.Clear","Diagnostic.Set","Document.Save","Document.SaveAs","error","executeCommand","FileSystem.Copy","FileSystem.CreateDirectory","FileSystem.Delete","FileSystem.ReadDirectory","FileSystem.ReadFile","FileSystem.Rename","FileSystem.Stat","FileSystem.WriteFile","FileWatcher.Register","FileWatcher.Unregister","findFiles","findTextInFiles","git.openChange","git.openFile","html","Keybinding.GetResolved","Languages.GetAll","message","NativeHost.OpenExternal","openDocument","postMessage","readFile","register_call_hierarchy_provider","register_code_actions_provider","register_code_lens_provider","register_color_provider","register_completion_item_provider","register_declaration_provider","register_definition_provider","register_document_drop_edit_provider","register_document_formatting_provider","register_document_highlight_provider","register_document_link_provider","register_document_paste_edit_provider","register_document_range_formatting_provider","register_document_symbol_provider","register_evaluatable_expression_provider","register_folding_range_provider","register_hover_provider","register_implementation_provider","register_inlay_hints_provider","register_inline_completion_item_provider","register_inline_edit_provider","register_inline_values_provider","register_linked_editing_range_provider","register_mapped_edits_provider","register_multi_document_highlight_provider","register_on_type_formatting_provider","register_reference_provider","register_rename_provider","register_selection_range_provider","register_semantic_tokens_provider","register_signature_help_provider","register_type_definition_provider","register_type_hierarchy_provider","register_workspace_symbol_provider","saveAll","Search.TextSearch","secrets.delete","secrets.get","secrets.store","setHtml","setStatusBarText","showTextDocument","stat","Storage.Get","Storage.GetItems","Storage.Set","Task.Execute","Task.Fetch","Task.Terminate","Terminal.GetProcessId","Terminal.Hide","Terminal.Resize","Terminal.Show","terminate_task","tree.dispose","tree.register","tree.reveal","tree.unregister","UserInterface.ShowInputBox","UserInterface.ShowMessage","UserInterface.ShowOpenDialog","UserInterface.ShowQuickPick","UserInterface.ShowSaveDialog","viewId","vscode.diff","warning","webview.postMessage","webview.registerView","webview.setHtml","webview.unregisterView","window.revealRange","Window.ShowInputBox","Window.ShowMessage","Window.ShowOpenDialog","Window.ShowQuickPick","Window.ShowSaveDialog","Workspace.IsResourceTrusted","Workspace.RequestResourceTrust","Workspace.Save","Workspace.SaveAll","Workspace.SaveAs"]);

/** StockLift exports (tier 2). */
export const StockLiftExports: ReadonlySet<string> = new Set<string>();

/** Cocoon bespoke Node fallback exports (tier 3). */
export const BespokeCocoonMethods: ReadonlySet<string> = new Set<string>(["FindTextInFilesNodeFallback"]);

/** Summary counts - used by DualTrack for boot-time banner. */
export const RouteManifestSummary = {
	mountain: 143,
	stockLift: 0,
	bespoke: 1,
	generatedAt: "2026-06-11T02:37:40Z",
} as const;
