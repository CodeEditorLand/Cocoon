var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
class TreeViewImplementation {
  constructor(viewID, dataProvider, ipc, commandService, extension) {
    this.viewID = viewID;
    this.dataProvider = dataProvider;
    this.ipc = ipc;
    this.commandService = commandService;
    this.extension = extension;
    if (this.dataProvider.onDidChangeTreeData) {
      this.dataProvider.onDidChangeTreeData((elements) => {
        const handlesToRefresh = this.getHandlesToRefresh(elements);
        this.ipc.SendNotification(`$refreshTreeView`, [
          this.viewID,
          handlesToRefresh
        ]);
      });
    }
  }
  static {
    __name(this, "TreeViewImplementation");
  }
  // A map from the extension's data element to its handle.
  elementToHandleMap = /* @__PURE__ */ new Map();
  handleToElementMap = /* @__PURE__ */ new Map();
  // --- Public Event Emitters ---
  onDidExpandElementEmitter = CreateEventStream();
  onDidExpandElement = this.onDidExpandElementEmitter.Stream.pipe(Stream.toEvent);
  onDidCollapseElementEmitter = CreateEventStream();
  onDidCollapseElement = this.onDidCollapseElementEmitter.Stream.pipe(Stream.toEvent);
  onDidChangeSelectionEmitter = CreateEventStream();
  onDidChangeSelection = this.onDidChangeSelectionEmitter.Stream.pipe(Stream.toEvent);
  onDidChangeVisibilityEmitter = CreateEventStream();
  onDidChangeVisibility = this.onDidChangeVisibilityEmitter.Stream.pipe(Stream.toEvent);
  getChildrenEffect(element) {
    return Effect.tryPromise(
      () => this.dataProvider.getChildren(element)
    ).pipe(
      Effect.flatMap((children) => {
        if (!children) {
          return Effect.succeed([]);
        }
        const itemEffects = children.map(
          (child) => this.resolveAndCacheItem(child)
        );
        return Effect.all(itemEffects);
      })
    );
  }
  resolveAndCacheItem(element) {
    return Effect.tryPromise(
      () => this.dataProvider.getTreeItem(element)
    ).pipe(
      Effect.map((treeItem) => {
        const handle = this.getHandleForElement(element);
        const commandConverter = new TypeConverter.Command.Definition(
          this.commandService,
          () => void 0
        );
        return TypeConverter.TreeView.Item.FromAPI(
          this.extension,
          treeItem,
          handle,
          void 0,
          // Parent handle is managed by the host
          commandConverter
        );
      })
    );
  }
  getHandleForElement(element) {
    if (this.elementToHandleMap.has(element)) {
      return this.elementToHandleMap.get(element);
    }
    const handle = generateUuid();
    this.elementToHandleMap.set(element, handle);
    this.handleToElementMap.set(handle, element);
    return handle;
  }
  getHandlesToRefresh(elements) {
    if (elements === null || elements === void 0) {
      return void 0;
    }
    if (Array.isArray(elements)) {
      return elements.map((e) => this.elementToHandleMap.get(e) || null);
    }
    return [this.elementToHandleMap.get(elements) || null];
  }
  // --- Public API Methods ---
  reveal(element, options) {
    return Effect.runPromise(
      this.ipc.SendNotification("$revealTreeViewItem", [
        this.viewID,
        this.getHandleForElement(element),
        options
      ])
    );
  }
  dispose() {
    this.onDidExpandElementEmitter.Shutdown();
    this.onDidCollapseElementEmitter.Shutdown();
    this.onDidChangeSelectionEmitter.Shutdown();
    this.onDidChangeVisibilityEmitter.Shutdown();
    this.elementToHandleMap.clear();
    this.handleToElementMap.clear();
  }
  // --- Stubs for writable properties ---
  selection = [];
  visible = true;
  message;
  title;
  description;
  badge;
}
export {
  TreeViewImplementation
};
//# sourceMappingURL=TreeViewImplementation.js.map
