var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Comments/Namespace.ts
var ThreadKey = /* @__PURE__ */ __name((Uri, Range) => {
  const UriStr = typeof Uri === "string" ? Uri : Uri?.toString?.() ?? "";
  const R = Range;
  const Line = R?.start?.line ?? 0;
  const Char = R?.start?.character ?? 0;
  return `${UriStr}:${Line}:${Char}`;
}, "ThreadKey");
var CreateCommentsNamespace = /* @__PURE__ */ __name((Context) => {
  return {
    createCommentController: /* @__PURE__ */ __name((Id, Label) => {
      const ControllerKey = `__commentController:${Id}`;
      const Existing = Context.ExtensionRegistry.get(ControllerKey);
      if (Existing) {
        return Existing;
      }
      const Threads = /* @__PURE__ */ new Map();
      const Controller = {
        id: Id,
        label: Label,
        commentingRangeProvider: void 0,
        reactionHandler: void 0,
        options: void 0,
        createCommentThread: /* @__PURE__ */ __name((Uri, Range, Comments) => {
          const Key = ThreadKey(Uri, Range);
          const Thread = {
            uri: Uri,
            range: Range,
            comments: Array.isArray(Comments) ? Comments : [],
            collapsibleState: 0,
            canReply: true,
            contextValue: void 0,
            label: void 0,
            state: void 0,
            dispose: /* @__PURE__ */ __name(() => {
              Threads.delete(Key);
            }, "dispose")
          };
          Threads.set(Key, Thread);
          return Thread;
        }, "createCommentThread"),
        dispose: /* @__PURE__ */ __name(() => {
          for (const Thread of Threads.values()) {
            try {
              Thread.dispose();
            } catch {
            }
          }
          Threads.clear();
          Context.ExtensionRegistry.delete(ControllerKey);
        }, "dispose")
      };
      Context.ExtensionRegistry.set(ControllerKey, Controller);
      return Controller;
    }, "createCommentController")
  };
}, "CreateCommentsNamespace");
var Namespace_default = CreateCommentsNamespace;
export {
  Namespace_default as default
};
//# sourceMappingURL=Namespace.js.map
