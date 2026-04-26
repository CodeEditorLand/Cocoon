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

// Source/Services/Handler/VscodeAPI/WorkspaceNamespace/Providers.ts
var MakeProvider = /* @__PURE__ */ __name((Context, RegisterMethod, UnregisterMethod, _LegacyHandlePrefix, ExtraPayload, OnRegister, OnDispose) => (Key, _Provider, _Options) => {
  const Handle = NextProviderHandle();
  Context.SendToMountain(RegisterMethod, {
    handle: Handle,
    ...ExtraPayload(Key)
  }).catch(() => {
  });
  OnRegister?.(Handle, Key, _Provider);
  return {
    dispose: /* @__PURE__ */ __name(() => {
      OnDispose?.(Handle, Key);
      Context.SendToMountain(UnregisterMethod, { handle: Handle }).catch(
        () => {
        }
      );
    }, "dispose")
  };
}, "MakeProvider");
var BuildRegisterTextDocumentContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_text_document_content_provider",
  "unregister_text_document_content_provider",
  "textDocumentContent",
  (Scheme) => ({ scheme: Scheme, extension_id: "" }),
  (_Handle, Scheme, Provider) => {
    Context.ExtensionRegistry.set(
      `__textDocumentContentProvider:${Scheme}`,
      Provider
    );
  },
  (_Handle, Scheme) => {
    Context.ExtensionRegistry.delete(
      `__textDocumentContentProvider:${Scheme}`
    );
  }
), "BuildRegisterTextDocumentContentProvider");
var ClaimedFileSystemSchemes = /* @__PURE__ */ new Set();
var BuildRegisterFileSystemProvider = /* @__PURE__ */ __name((Context) => (Scheme, _Provider, Options) => {
  const Handle = NextProviderHandle();
  ClaimedFileSystemSchemes.add(Scheme);
  Context.SendToMountain("register_file_system_provider", {
    handle: Handle,
    scheme: Scheme,
    is_case_sensitive: Options?.isCaseSensitive ?? true,
    is_readonly: Options?.isReadonly ?? false,
    extension_id: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      ClaimedFileSystemSchemes.delete(Scheme);
      Context.SendToMountain("unregister_file_system_provider", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose")
  };
}, "BuildRegisterFileSystemProvider");
var BuildRegisterTaskProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_task_provider",
  "unregister_task_provider",
  "taskProvider",
  (TaskType) => ({ task_type: TaskType, extension_id: "" })
), "BuildRegisterTaskProvider");
var BuildRegisterNotebookContentProvider = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_content_provider",
  "unregister_notebook_content_provider",
  "notebookContent",
  (NotebookType) => ({ notebook_type: NotebookType, extension_id: "" })
), "BuildRegisterNotebookContentProvider");
var BuildRegisterNotebookSerializer = /* @__PURE__ */ __name((Context) => MakeProvider(
  Context,
  "register_notebook_serializer",
  "unregister_notebook_serializer",
  "notebookSerializer",
  (NotebookType) => ({ notebook_type: NotebookType, extension_id: "" })
), "BuildRegisterNotebookSerializer");
var BuildRegisterRemoteAuthorityResolver = /* @__PURE__ */ __name((Context) => (AuthorityPrefix, _Resolver) => {
  Context.SendToMountain("register_remote_authority_resolver", {
    authority_prefix: AuthorityPrefix,
    extension_id: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain(
        "unregister_remote_authority_resolver",
        { authority_prefix: AuthorityPrefix }
      ).catch(() => {
      });
    }, "dispose")
  };
}, "BuildRegisterRemoteAuthorityResolver");
var BuildRegisterResourceLabelFormatter = /* @__PURE__ */ __name((Context) => (Formatter) => {
  Context.SendToMountain("register_resource_label_formatter", {
    formatter: Formatter
  }).catch(() => {
  });
  return { dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") };
}, "BuildRegisterResourceLabelFormatter");
export {
  BuildRegisterFileSystemProvider,
  BuildRegisterNotebookContentProvider,
  BuildRegisterNotebookSerializer,
  BuildRegisterRemoteAuthorityResolver,
  BuildRegisterResourceLabelFormatter,
  BuildRegisterTaskProvider,
  BuildRegisterTextDocumentContentProvider,
  ClaimedFileSystemSchemes
};
//# sourceMappingURL=Providers.js.map
