var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Tests/Namespace.ts
var NoOp = /* @__PURE__ */ __name(() => {
}, "NoOp");
var MakeTestItemCollection = /* @__PURE__ */ __name((Owner) => {
  const Items = /* @__PURE__ */ new Map();
  const Collection = {
    get size() {
      return Items.size;
    },
    add(Item) {
      if (!Item?.id) return;
      Item.parent = Owner ?? void 0;
      Items.set(Item.id, Item);
    },
    delete(Id) {
      Items.delete(Id);
    },
    get(Id) {
      return Items.get(Id);
    },
    replace(Next) {
      Items.clear();
      for (const Item of Next) {
        if (Item?.id) {
          Item.parent = Owner ?? void 0;
          Items.set(Item.id, Item);
        }
      }
    },
    forEach(Cb) {
      for (const Item of Items.values()) {
        try {
          Cb(Item, Collection);
        } catch {
        }
      }
    }
  };
  return Collection;
}, "MakeTestItemCollection");
var MakeTestItem = /* @__PURE__ */ __name((Id, Label, Uri) => {
  const Item = {
    id: Id,
    uri: Uri,
    label: Label,
    canResolveChildren: false,
    busy: false,
    tags: [],
    children: void 0
  };
  Item.children = MakeTestItemCollection(Item);
  return Item;
}, "MakeTestItem");
var MakeTestRun = /* @__PURE__ */ __name((Context, ControllerId, Name, Request, Persist) => {
  const Results = /* @__PURE__ */ new Map();
  const OutputBuffer = [];
  let Ended = false;
  const SetState = /* @__PURE__ */ __name((State) => (Item, MaybeMessage, MaybeDuration) => {
    if (Ended || !Item?.id) return;
    Results.set(Item.id, {
      state: State,
      duration: typeof MaybeDuration === "number" ? MaybeDuration : void 0,
      message: MaybeMessage && State !== "passed" && State !== "skipped" ? MaybeMessage : void 0
    });
  }, "SetState");
  const Run = {
    name: Name,
    isPersisted: Persist,
    token: {
      isCancellationRequested: false,
      onCancellationRequested: /* @__PURE__ */ __name(() => ({ dispose: NoOp }), "onCancellationRequested")
    },
    enqueued: SetState("queued"),
    started: SetState("started"),
    skipped: SetState("skipped"),
    failed: SetState("failed"),
    errored: SetState("errored"),
    passed: SetState("passed"),
    appendOutput: /* @__PURE__ */ __name((Output, _Location, _Test) => {
      if (Ended) return;
      if (typeof Output === "string" && Output.length > 0) {
        OutputBuffer.push(Output);
      }
    }, "appendOutput"),
    end: /* @__PURE__ */ __name(() => {
      if (Ended) return;
      Ended = true;
      try {
        Context.Emitter.emit("tests.didChangeTestResults", {
          controllerId: ControllerId,
          runName: Name,
          results: Object.fromEntries(Results),
          output: OutputBuffer.join("")
        });
      } catch {
      }
    }, "end")
  };
  return Run;
}, "MakeTestRun");
var CreateTestsNamespace = /* @__PURE__ */ __name((Context) => {
  const EventSubscriber = /* @__PURE__ */ __name((EventName) => (Listener) => {
    Context.Emitter.on(EventName, Listener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.off(EventName, Listener);
      }, "dispose")
    };
  }, "EventSubscriber");
  return {
    createTestController: /* @__PURE__ */ __name((Id, Label) => {
      const ControllerKey = `__testController:${Id}`;
      const Existing = Context.ExtensionRegistry.get(ControllerKey);
      if (Existing) {
        return Existing;
      }
      const Items = MakeTestItemCollection(null);
      const Profiles = /* @__PURE__ */ new Map();
      let ProfileSeq = 0;
      const Controller = {
        id: Id,
        label: Label,
        items: Items,
        createRunProfile: /* @__PURE__ */ __name((ProfileLabel, Kind, RunHandler, IsDefault, Tag, SupportsContinuousRun) => {
          const ProfileId = ++ProfileSeq;
          const Profile = {
            label: ProfileLabel,
            kind: Kind,
            isDefault: Boolean(IsDefault),
            tag: Tag,
            supportsContinuousRun: Boolean(SupportsContinuousRun),
            runHandler: RunHandler,
            configureHandler: void 0,
            dispose: /* @__PURE__ */ __name(() => {
              Profiles.delete(ProfileId);
            }, "dispose")
          };
          Profiles.set(ProfileId, Profile);
          return Profile;
        }, "createRunProfile"),
        resolveHandler: void 0,
        refreshHandler: void 0,
        invalidateTestResults: /* @__PURE__ */ __name((_Item) => {
        }, "invalidateTestResults"),
        createTestItem: /* @__PURE__ */ __name((ItemId, ItemLabel, Uri) => MakeTestItem(ItemId, ItemLabel, Uri), "createTestItem"),
        createTestRun: /* @__PURE__ */ __name((Request, Name, Persist) => MakeTestRun(
          Context,
          Id,
          typeof Name === "string" ? Name : "",
          Request ?? {},
          Persist !== false
        ), "createTestRun"),
        dispose: /* @__PURE__ */ __name(() => {
          Context.ExtensionRegistry.delete(ControllerKey);
          Profiles.clear();
        }, "dispose")
      };
      Context.ExtensionRegistry.set(ControllerKey, Controller);
      return Controller;
    }, "createTestController"),
    // `onDidChangeTestResults` - fires when any TestRun.end() lands.
    // Payload: `{ controllerId, runName, results, output }`.
    onDidChangeTestResults: EventSubscriber("tests.didChangeTestResults")
  };
}, "CreateTestsNamespace");
var Namespace_default = CreateTestsNamespace;
export {
  Namespace_default as default
};
//# sourceMappingURL=Namespace.js.map
