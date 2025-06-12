var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
let HandleCounter = 0;
class TreeViewImpl {
  constructor(ViewId, DataProvider, Ipc, CommandConverter, Extension) {
    this.ViewId = ViewId;
    this.DataProvider = DataProvider;
    this.Ipc = Ipc;
    this.CommandConverter = CommandConverter;
    this.Extension = Extension;
    if (this.DataProvider.onDidChangeTreeData) {
      this.DataProvider.onDidChangeTreeData(
        (elements) => this.OnDidChangeDataEvent.Fire(elements)
      );
    }
    const DebouncedRefresh = Stream.debounce(
      this.OnDidChangeDataEvent.Stream,
      "200 millis"
    );
    Stream.runForEach(
      DebouncedRefresh,
      (elements) => this.Ipc.SendNotification(`$refreshTreeView`, [
        this.ViewId,
        this.getHandlesToRefresh(elements)
      ])
    ).pipe(Effect.runFork);
  }
  static {
    __name(this, "TreeViewImpl");
  }
  NodeCache = /* @__PURE__ */ new Map();
  HandleCache = /* @__PURE__ */ new Map();
  OnDidChangeDataEvent = CreateEventStream();
  // Public Events (stubs for now)
  onDidExpandElement = new CreateEventStream().Stream.pipe(Stream.toEvent);
  onDidCollapseElement = new CreateEventStream().Stream.pipe(Stream.toEvent);
  onDidChangeSelection = new CreateEventStream().Stream.pipe(Stream.toEvent);
  onDidChangeVisibility = new CreateEventStream().Stream.pipe(Stream.toEvent);
  GetChildrenEffect(Element) {
    return Effect.tryPromise(
      () => this.DataProvider.getChildren(Element)
    ).pipe(
      Effect.flatMap((Children) => {
        if (!Children) return Effect.succeed([]);
        const ParentHandle = Element ? this.getHandleForElement(Element) : void 0;
        const ItemEffects = Children.map(
          (child) => this.resolveAndCacheItem(child, ParentHandle)
        );
        return Effect.all(ItemEffects);
      })
    );
  }
  resolveAndCacheItem(element, parentHandle) {
    return Effect.tryPromise(
      () => this.DataProvider.getTreeItem(element)
    ).pipe(
      Effect.map((treeItem) => {
        const handle = this.getHandleForElement(element);
        this.NodeCache.set(element, treeItem);
        this.HandleCache.set(handle, element);
        return TypeConverter.TreeView.Item.fromApi(
          this.Extension,
          treeItem,
          handle,
          parentHandle,
          this.CommandConverter
        );
      })
    );
  }
  getHandleForElement(element) {
    return `element-${HandleCounter++}`;
  }
  getHandlesToRefresh(elements) {
    return null;
  }
  // Public API Methods
  reveal = /* @__PURE__ */ __name((element, options) => Effect.runPromise(
    this.Ipc.SendNotification("$revealTreeViewItem", [
      this.ViewId,
      this.getHandleForElement(element),
      options
    ])
  ), "reveal");
  dispose = /* @__PURE__ */ __name(() => {
  }, "dispose");
  // ... other properties
  selection = [];
  visible = true;
  message;
  title;
  description;
  badge;
}
export {
  TreeViewImpl
};
//# sourceMappingURL=TreeViewImpl.js.map
