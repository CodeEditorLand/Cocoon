import { Context, Effect, Layer } from "effect";
import * as Service from "../../Service/mod.js";
import { CreateApiFactory } from "./CreateApiFactory.js";
const Tag = Context.Tag("ApiFactory");
const Live = Layer.effect(
  Tag,
  Effect.gen(function* (_) {
    const LogService = yield* _(Service.Log.Tag);
    const ProposedApiService = yield* _(Service.ProposedApi.Tag);
    const DeprecationService = yield* _(Service.ApiDeprecation.Tag);
    const CommandsService = yield* _(Service.Commands.Tag);
    const WorkspaceService = yield* _(Service.Workspace.Tag);
    const WindowService = yield* _(Service.Window.Tag);
    const LanguageFeaturesService = yield* _(Service.LanguageFeatures.Tag);
    const DebugService = yield* _(Service.Debug.Tag);
    const TasksService = yield* _(Service.Tasks.Tag);
    const ExtensionService = yield* _(Service.Extension.Tag);
    const WebviewPanelService = yield* _(Service.WebviewPanel.Tag);
    const CustomEditorService = yield* _(Service.CustomEditor.Tag);
    const TreeViewService = yield* _(Service.TreeView.Tag);
    const StatusBarService = yield* _(Service.StatusBar.Tag);
    return CreateApiFactory(
      LogService,
      ProposedApiService,
      DeprecationService,
      CommandsService,
      WorkspaceService,
      WindowService,
      LanguageFeaturesService,
      DebugService,
      TasksService,
      ExtensionService,
      WebviewPanelService,
      CustomEditorService,
      TreeViewService,
      StatusBarService
    );
  })
);
export {
  Live,
  Tag
};
//# sourceMappingURL=mod.js.map
