var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { generateUuid } from "@codeeditorland/output/vs/base/common/uuid.js";
import { Effect, Ref } from "effect";
import { IPCService } from "./IPC.js";
import { FromAPI as TreeViewItemToDTO } from "./TypeConverter/TreeView/Item.js";
import { FromAPI as TreeViewOptionToDTO } from "./TypeConverter/TreeView/Option.js";
import { CreateEventStream } from "./Utility/EventStream.js";
class TreeViewImplementation {
  constructor(ViewId, DataProvider, IPC, Extension) {
    this.ViewId = ViewId;
    this.DataProvider = DataProvider;
    this.IPC = IPC;
    this.Extension = Extension;
    this.onDidExpandElement = this.OnDidExpandElementEmitter.event;
    this.onDidCollapseElement = this.OnDidCollapseElementEmitter.event;
    this.onDidChangeSelection = this.OnDidChangeSelectionEmitter.event;
    this.onDidChangeVisibility = this.OnDidChangeVisibilityEmitter.event;
    this.onDidChangeCheckboxState = this.OnDidChangeCheckboxStateEmitter.event;
    this.onDidChangeActiveItem = this.OnDidChangeActiveItemEmitter.event;
    if (this.DataProvider.onDidChangeTreeData) {
      this.DataProvider.onDidChangeTreeData((Elements) => {
        const HandlesToRefresh = this.GetHandlesToRefresh(Elements);
        Effect.runFork(
          this.IPC.SendNotification(`$refreshTreeView`, [
            this.ViewId,
            HandlesToRefresh
          ])
        );
      });
    }
  }
  static {
    __name(this, "TreeViewImplementation");
  }
  ElementToHandleMap = /* @__PURE__ */ new Map();
  handleToElementMap = /* @__PURE__ */ new Map();
  OnDidExpandElementEmitter = CreateEventStream();
  onDidExpandElement;
  OnDidCollapseElementEmitter = CreateEventStream();
  onDidCollapseElement;
  OnDidChangeSelectionEmitter = CreateEventStream();
  onDidChangeSelection;
  OnDidChangeVisibilityEmitter = CreateEventStream();
  onDidChangeVisibility;
  OnDidChangeCheckboxStateEmitter = CreateEventStream();
  onDidChangeCheckboxState;
  // FIX: onDidChangeActiveItem is a complex event; stubbing for now.
  OnDidChangeActiveItemEmitter = CreateEventStream();
  onDidChangeActiveItem;
  activeItem;
  selection = [];
  visible = true;
  message;
  title;
  description;
  badge;
  GetChildren(Element) {
    return Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => this.DataProvider.getChildren(Element), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    }).pipe(
      Effect.flatMap((Children) => {
        if (!Children) return Effect.succeed([]);
        const ItemEffects = Children.map(
          (Child) => this.ResolveAndCacheItem(Child, void 0)
        );
        return Effect.all(ItemEffects);
      })
    );
  }
  ResolveAndCacheItem(Element, ParentHandle) {
    return Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => this.DataProvider.getTreeItem(Element), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    }).pipe(
      Effect.map((TreeItem) => {
        const Handle = this.GetHandleForElement(Element);
        const CommandConverter = new class {
          ToInternal = /* @__PURE__ */ __name((c) => c, "ToInternal");
        }();
        return TreeViewItemToDTO(
          this.Extension,
          TreeItem,
          Handle,
          ParentHandle,
          CommandConverter
        );
      })
    );
  }
  GetHandleForElement(Element) {
    if (this.ElementToHandleMap.has(Element)) {
      return this.ElementToHandleMap.get(Element);
    }
    const Handle = generateUuid();
    this.ElementToHandleMap.set(Element, Handle);
    this.handleToElementMap.set(Handle, Element);
    return Handle;
  }
  GetHandlesToRefresh(Elements) {
    if (Elements === null || Elements === void 0) return void 0;
    if (Array.isArray(Elements)) {
      return Elements.map(
        (Element) => this.ElementToHandleMap.get(Element) || null
      );
    }
    return [this.ElementToHandleMap.get(Elements) || null];
  }
  reveal(Element, Options) {
    return Effect.runPromise(
      this.IPC.SendNotification("$revealTreeViewItem", [
        this.ViewId,
        this.GetHandleForElement(Element),
        Options
      ])
    );
  }
  dispose() {
    this.OnDidExpandElementEmitter.Shutdown();
    this.OnDidCollapseElementEmitter.Shutdown();
    this.OnDidChangeSelectionEmitter.Shutdown();
    this.OnDidChangeVisibilityEmitter.Shutdown();
    this.OnDidChangeCheckboxStateEmitter.Shutdown();
    this.OnDidChangeActiveItemEmitter.Shutdown();
    this.ElementToHandleMap.clear();
    this.handleToElementMap.clear();
  }
}
class TreeViewService extends Effect.Service()(
  "Service/TreeView",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const ActiveViewsRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      const GetChildren = /* @__PURE__ */ __name((ViewId, ParentHandle) => Effect.gen(function* () {
        const View = (yield* Ref.get(ActiveViewsRef)).get(ViewId);
        if (!View) return [];
        const ParentElement = ParentHandle ? View.handleToElementMap.get(ParentHandle) : void 0;
        return yield* View.GetChildren(ParentElement);
      }), "GetChildren");
      const DisposeTreeView = /* @__PURE__ */ __name((ViewId) => Effect.gen(function* () {
        const View = (yield* Ref.get(ActiveViewsRef)).get(ViewId);
        if (View) {
          View.dispose();
          yield* Ref.update(
            ActiveViewsRef,
            (Map2) => (Map2.delete(ViewId), Map2)
          );
        }
      }), "DisposeTreeView");
      IPC.RegisterInvokeHandler(
        "$getChildren",
        ([ViewId, ParentHandle]) => Effect.runPromise(GetChildren(ViewId, ParentHandle))
      );
      IPC.RegisterInvokeHandler(
        "$disposeTreeView",
        ([ViewId]) => Effect.runPromise(DisposeTreeView(ViewId))
      );
      return {
        CreateTreeView: /* @__PURE__ */ __name((ViewId, Options, Extension) => Effect.gen(function* () {
          if ((yield* Ref.get(ActiveViewsRef)).has(ViewId)) {
            return yield* Effect.fail(
              new Error(
                `Tree view '${ViewId}' already registered.`
              )
            );
          }
          if (!Options.treeDataProvider) {
            return yield* Effect.fail(
              new Error(
                "TreeViewOptions must include a TreeDataProvider."
              )
            );
          }
          const OptionDTO = TreeViewOptionToDTO(Options);
          yield* IPC.SendNotification(
            "$registerTreeDataProvider",
            [ViewId, OptionDTO]
          );
          const ExtHostView = new TreeViewImplementation(
            ViewId,
            Options.treeDataProvider,
            IPC,
            Extension
          );
          yield* Ref.update(
            ActiveViewsRef,
            (Map2) => Map2.set(ViewId, ExtHostView)
          );
          return ExtHostView;
        }), "CreateTreeView")
      };
    })
  }
) {
  static {
    __name(this, "TreeViewService");
  }
}
export {
  TreeViewImplementation,
  TreeViewService
};
//# sourceMappingURL=TreeView.js.map
