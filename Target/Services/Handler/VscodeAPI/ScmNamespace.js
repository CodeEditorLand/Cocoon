var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/ScmNamespace.ts
var ScmCounter = 0;
var CreateScmNamespace = /* @__PURE__ */ __name((Context) => ({
  createSourceControl: /* @__PURE__ */ __name((Id, Label, RootUri) => {
    const Handle = `scm:${++ScmCounter}`;
    Context.SendToMountain("register_scm_provider", {
      handle: Handle,
      id: Id,
      label: Label,
      root_uri: RootUri,
      extension_id: ""
    }).catch(() => {
    });
    const Groups = /* @__PURE__ */ new Map();
    return {
      id: Id,
      label: Label,
      rootUri: RootUri,
      inputBox: {
        value: "",
        placeholder: "",
        enabled: true,
        visible: true
      },
      createResourceGroup: /* @__PURE__ */ __name((GroupId, GroupLabel) => {
        const GroupHandle = `${Handle}/${GroupId}`;
        Groups.set(GroupId, { label: GroupLabel, resourceStates: [] });
        Context.SendToMountain("register_scm_resource_group", {
          scm_handle: Handle,
          group_handle: GroupHandle,
          group_id: GroupId,
          label: GroupLabel
        }).catch(() => {
        });
        const State = { resourceStates: [] };
        return {
          id: GroupId,
          label: GroupLabel,
          get resourceStates() {
            return State.resourceStates;
          },
          set resourceStates(Value) {
            State.resourceStates = Value;
            Context.SendToMountain("update_scm_group", {
              scm_handle: Handle,
              group_handle: GroupHandle,
              resource_states: Value
            }).catch(() => {
            });
          },
          dispose: /* @__PURE__ */ __name(() => {
            Context.SendToMountain(
              "unregister_scm_resource_group",
              {
                scm_handle: Handle,
                group_handle: GroupHandle
              }
            ).catch(() => {
            });
            Groups.delete(GroupId);
          }, "dispose")
        };
      }, "createResourceGroup"),
      statusBarCommands: [],
      count: 0,
      commitTemplate: "",
      acceptInputCommand: void 0,
      quickDiffProvider: void 0,
      dispose: /* @__PURE__ */ __name(() => {
        Context.SendToMountain("unregister_scm_provider", {
          handle: Handle
        }).catch(() => {
        });
        Groups.clear();
      }, "dispose")
    };
  }, "createSourceControl"),
  inputBox: { value: "" }
}), "CreateScmNamespace");
var ScmNamespace_default = CreateScmNamespace;
export {
  ScmNamespace_default as default
};
//# sourceMappingURL=ScmNamespace.js.map
