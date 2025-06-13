import { Effect, Layer } from "effect";
import * as Service from "../../Service.js";
import { CreateAPIFactory } from "./APIFactory/Create.js";
import { Tag } from "./APIFactory/Service.js";
const Live = Layer.effect(
  Tag,
  Effect.gen(function* (_) {
    const LogService = yield* _(Service.Log.Tag);
    const ProposedAPIService = yield* _(Service.ProposedAPI.Tag);
    const DeprecationService = yield* _(Service.APIDeprecation.Tag);
    const CommandService = yield* _(Service.Command.Tag);
    const WorkSpaceService = yield* _(Service.WorkSpace.Tag);
    const WindowService = yield* _(Service.Window.Tag);
    const LanguageFeatureService = yield* _(Service.LanguageFeature.Tag);
    const DebugService = yield* _(Service.Debug.Tag);
    const TaskService = yield* _(Service.Task.Tag);
    const ExtensionService = yield* _(Service.Extension.Tag);
    const WebViewPanelService = yield* _(Service.WebViewPanel.Tag);
    const CustomEditorService = yield* _(Service.CustomEditor.Tag);
    const TreeViewService = yield* _(Service.TreeView.Tag);
    const StatusBarService = yield* _(Service.StatusBar.Tag);
    return CreateAPIFactory(
      LogService,
      ProposedAPIService,
      DeprecationService,
      CommandService,
      WorkSpaceService,
      WindowService,
      LanguageFeatureService,
      DebugService,
      TaskService,
      ExtensionService,
      WebViewPanelService,
      CustomEditorService,
      TreeViewService,
      StatusBarService
    );
  })
);
export {
  Live
};
//# sourceMappingURL=APIFactory.js.map
