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
// Generated: 2026-05-15T21:13:54Z

/** Mountain-side RPC method names known to have a Rust handler. */
export const MountainMethods: ReadonlySet<string> = new Set<string>(["$disposeStatusBarMessage","$gitExec","$resolveCustomEditor","$scm:createSourceControl","$scm:registerInputBox","$scm:updateGroup","$scm:updateSourceControl","$setStatusBarMessage","$statusBar:dispose","$statusBar:set","$terminal:create","$terminal:dispose","$terminal:resize","$terminal:sendText","$tree:register","$updateWorkspaceFolders","applyEdit","Authentication.GetAccounts","Authentication.GetSession","Clipboard.Read","Clipboard.Write","Command.Execute","Command.GetAll","config.get","config.update","Configuration.Inspect","Configuration.Update","Debug.RegisterConfigurationProvider","Debug.Start","Debug.Stop","Diagnostic.Clear","Diagnostic.Set","Document.Save","Document.SaveAs","error","executeCommand","FileSystem.Copy","FileSystem.CreateDirectory","FileSystem.Delete","FileSystem.ReadDirectory","FileSystem.ReadFile","FileSystem.Rename","FileSystem.Stat","FileSystem.WriteFile","FileWatcher.Register","FileWatcher.Unregister","findFiles","findTextInFiles","html","Keybinding.GetResolved","Languages.GetAll","message","NativeHost.OpenExternal","openDocument","postMessage","readFile","register_call_hierarchy_provider","register_code_actions_provider","register_code_lens_provider","register_color_provider","register_completion_item_provider","register_declaration_provider","register_definition_provider","register_document_formatting_provider","register_document_highlight_provider","register_document_link_provider","register_document_range_formatting_provider","register_document_symbol_provider","register_evaluatable_expression_provider","register_folding_range_provider","register_hover_provider","register_implementation_provider","register_inlay_hints_provider","register_inline_values_provider","register_linked_editing_range_provider","register_on_type_formatting_provider","register_reference_provider","register_rename_provider","register_selection_range_provider","register_semantic_tokens_provider","register_signature_help_provider","register_type_definition_provider","register_type_hierarchy_provider","register_workspace_symbol_provider","Search.TextSearch","secrets.delete","secrets.get","secrets.store","setHtml","showTextDocument","stat","Storage.Get","Storage.Set","Task.Execute","Task.Fetch","Terminal.GetProcessId","Terminal.Resize","tree.dispose","tree.register","tree.unregister","UserInterface.ShowInputBox","UserInterface.ShowMessage","UserInterface.ShowOpenDialog","UserInterface.ShowQuickPick","UserInterface.ShowSaveDialog","viewId","warning","webview.postMessage","webview.registerView","webview.setHtml","webview.unregisterView","Window.ShowInputBox","Window.ShowMessage","Window.ShowOpenDialog","Window.ShowQuickPick","Window.ShowSaveDialog","Workspace.IsResourceTrusted","Workspace.RequestResourceTrust"]);

/** StockLift exports (tier 2). */
export const StockLiftExports: ReadonlySet<string> = new Set<string>();

/** Cocoon bespoke Node fallback exports (tier 3). */
export const BespokeCocoonMethods: ReadonlySet<string> = new Set<string>(["FindTextInFilesNodeFallback"]);

/** Summary counts - used by DualTrack for boot-time banner. */
export const RouteManifestSummary = {
	mountain: 118,
	stockLift: 0,
	bespoke: 1,
	generatedAt: "2026-05-15T21:13:54Z",
} as const;
