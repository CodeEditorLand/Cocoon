var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/LanguageProviderRegistry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.LAND_DEV_LOG) {
    console.warn(
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Services/Handler/VscodeAPI/ScmNamespace.ts
var CreateScmNamespace = /* @__PURE__ */ __name((Context) => ({
  createSourceControl: /* @__PURE__ */ __name((Id, Label, RootUri) => {
    const Handle = NextProviderHandle();
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
