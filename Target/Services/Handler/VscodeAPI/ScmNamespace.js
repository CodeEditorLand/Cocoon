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
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
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
var ScmTraceEnabled = typeof process !== "undefined" && typeof process.env["LAND_DEV_LOG"] === "string";
var ScmTrace = /* @__PURE__ */ __name((Message) => {
  if (!ScmTraceEnabled) return;
  try {
    process.stdout.write(`[DEV:SCM-TRACE] ${Message}
`);
  } catch {
  }
}, "ScmTrace");
var CreateScmNamespace = /* @__PURE__ */ __name((Context) => ({
  createSourceControl: /* @__PURE__ */ __name((Id, Label, RootUri) => {
    const Handle = NextProviderHandle();
    const RootUriShape = RootUri == null ? "null" : typeof RootUri === "string" ? `string("${RootUri}")` : typeof RootUri === "object" ? `object(scheme=${RootUri?.scheme ?? "<missing>"})` : typeof RootUri;
    ScmTrace(
      `createSourceControl id="${Id}" label="${Label}" rootUri=${RootUriShape} handle=${Handle}`
    );
    Context.SendToMountain("register_scm_provider", {
      handle: Handle,
      id: Id,
      label: Label,
      root_uri: RootUri,
      extension_id: ""
    }).then(() => ScmTrace(`register_scm_provider ack id="${Id}" handle=${Handle}`)).catch((Error2) => {
      const Message = Error2 instanceof Error2 ? Error2.message : String(Error2);
      ScmTrace(`register_scm_provider FAILED id="${Id}" handle=${Handle} error=${Message}`);
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
        ScmTrace(
          `createResourceGroup scm="${Id}" handle=${Handle} groupId="${GroupId}" groupLabel="${GroupLabel}"`
        );
        Context.SendToMountain("register_scm_resource_group", {
          scm_handle: Handle,
          group_handle: GroupHandle,
          group_id: GroupId,
          label: GroupLabel
        }).catch((Error2) => {
          ScmTrace(
            `register_scm_resource_group FAILED scm=${Handle} group="${GroupId}" error=${Error2 instanceof Error2 ? Error2.message : String(Error2)}`
          );
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
            ScmTrace(
              `update_scm_group scm=${Handle} group="${GroupId}" resourceCount=${Array.isArray(Value) ? Value.length : 0}`
            );
            Context.SendToMountain("update_scm_group", {
              scm_handle: Handle,
              group_handle: GroupHandle,
              resource_states: Value
            }).catch((Error2) => {
              ScmTrace(
                `update_scm_group FAILED scm=${Handle} group="${GroupId}" error=${Error2 instanceof Error2 ? Error2.message : String(Error2)}`
              );
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
