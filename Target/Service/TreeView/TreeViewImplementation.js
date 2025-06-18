var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import { default as CommandConverterDefinition } from "../../TypeConverter/Command/Definition.js";
import { TreeView as TreeViewConverter } from "../../TypeConverter/TreeView.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
class TreeViewImplementation {
  constructor(ViewID, DataProvider, IPC, Command, Extension) {
    this.ViewID = ViewID;
    this.DataProvider = DataProvider;
    this.IPC = IPC;
    this.Command = Command;
    this.Extension = Extension;
    this.onDidExpandElement = this.OnDidExpandElementEmitter.event;
    this.onDidCollapseElement = this.OnDidCollapseElementEmitter.event;
    this.onDidChangeSelection = this.OnDidChangeSelectionEmitter.event;
    this.onDidChangeVisibility = this.OnDidChangeVisibilityEmitter.event;
    this.onDidChangeCheckboxState = this.OnDidChangeCheckboxStateEmitter.event;
    if (this.DataProvider.onDidChangeTreeData) {
      this.DataProvider.onDidChangeTreeData((Elements) => {
        const HandlesToRefresh = this.GetHandlesToRefresh(Elements);
        Effect.runFork(
          this.IPC.SendNotification(`$refreshTreeView`, [
            this.ViewID,
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
  activeItem;
  onDidChangeActiveItem;
  GetChildrenEffect(Element) {
    return Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => this.DataProvider.getChildren(Element), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    }).pipe(
      Effect.flatMap((Children) => {
        if (!Children) {
          return Effect.succeed([]);
        }
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
        const CommandConverter = new CommandConverterDefinition(
          this.Command.RegisterCommand,
          (command, ...args) => this.Command.ExecuteCommand(command, ...args),
          () => void 0
        );
        return TreeViewConverter.Item.FromAPI(
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
    if (Elements === null || Elements === void 0 || Elements === void 0) {
      return void 0;
    }
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
        this.ViewID,
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
    this.ElementToHandleMap.clear();
    this.handleToElementMap.clear();
  }
  selection = [];
  visible = true;
  message;
  title;
  description;
  badge;
}
export {
  TreeViewImplementation as default
};
//# sourceMappingURL=TreeViewImplementation.js.map
