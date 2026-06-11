var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/WebviewPanel/State.ts
import { Effect } from "effect";
var STATE_VERSION = 1;
var StateService = class extends Effect.Service()(
  "State/WebviewPanel",
  {
    effect: Effect.gen(function* () {
      const StateCache = /* @__PURE__ */ new Map();
      const GetMountainClient = /* @__PURE__ */ __name(() => globalThis.__COCOON_MOUNTAIN_CLIENT__, "GetMountainClient");
      const StorageKey = /* @__PURE__ */ __name((Handle) => `webviewPanelState:${Handle}`, "StorageKey");
      const ValidateState = /* @__PURE__ */ __name((State) => Effect.gen(function* () {
        if (typeof State !== "object" || State === null || Array.isArray(State)) {
          return yield* Effect.fail(
            new Error("Panel state must be an object")
          );
        }
        const S = State;
        if (typeof S.Version !== "number") {
          return yield* Effect.fail(
            new Error("Panel state missing Version")
          );
        }
        if (typeof S.Handle !== "string") {
          return yield* Effect.fail(
            new Error("Panel state missing Handle")
          );
        }
        if (typeof S.ExtensionId !== "string") {
          return yield* Effect.fail(
            new Error("Panel state missing ExtensionId")
          );
        }
        if (typeof S.ViewType !== "string") {
          return yield* Effect.fail(
            new Error("Panel state missing ViewType")
          );
        }
        if (typeof S.Title !== "string") {
          return yield* Effect.fail(
            new Error("Panel state missing Title")
          );
        }
        if (typeof S.Position !== "object" || S.Position === null || Array.isArray(S.Position)) {
          return yield* Effect.fail(
            new Error("Panel state has invalid Position")
          );
        }
        const Position = S.Position;
        if (typeof Position.ViewColumn !== "number") {
          return yield* Effect.fail(
            new Error("Panel state has invalid ViewColumn")
          );
        }
        if (typeof Position.PreservedFocus !== "boolean") {
          return yield* Effect.fail(
            new Error("Panel state has invalid PreservedFocus")
          );
        }
        if (typeof S.ViewState !== "object" || S.ViewState === null || Array.isArray(S.ViewState)) {
          return yield* Effect.fail(
            new Error("Panel state has invalid ViewState")
          );
        }
        const ViewState = S.ViewState;
        if (typeof ViewState.Active !== "boolean" || typeof ViewState.Visible !== "boolean" || typeof ViewState.ViewColumn !== "number") {
          return yield* Effect.fail(
            new Error("Panel state has invalid ViewState")
          );
        }
        return S;
      }), "ValidateState");
      const CreatePanelState = /* @__PURE__ */ __name((Params) => {
        const State = {
          Version: STATE_VERSION,
          Handle: Params.Handle,
          ExtensionId: Params.ExtensionId,
          ViewType: Params.ViewType,
          Title: Params.Title,
          Position: Params.Position,
          ViewState: Params.ViewState,
          Options: Params.Options,
          IconPath: Params.IconPath,
          Content: Params.Content,
          Metadata: {
            CreatedAt: Date.now()
          }
        };
        return State;
      }, "CreatePanelState");
      const SavePanelState = /* @__PURE__ */ __name((PanelStateData) => Effect.gen(function* () {
        StateCache.set(PanelStateData.Handle, PanelStateData);
        void GetMountainClient()?.sendRequest("Storage.Set", [
          StorageKey(PanelStateData.Handle),
          PanelStateData
        ]).catch(() => void 0);
      }), "SavePanelState");
      const RestorePanelState = /* @__PURE__ */ __name((Handle) => Effect.gen(function* () {
        let State = StateCache.get(Handle);
        if (!State) {
          State = yield* Effect.tryPromise({
            try: /* @__PURE__ */ __name(async () => await GetMountainClient()?.sendRequest(
              "Storage.Get",
              [StorageKey(Handle)]
            ) ?? null, "try"),
            catch: /* @__PURE__ */ __name(() => null, "catch")
          }).pipe(Effect.orElseSucceed(() => null));
        }
        if (!State) {
          return null;
        }
        const ValidatedState = yield* ValidateState(State);
        StateCache.set(Handle, ValidatedState);
        return ValidatedState;
      }), "RestorePanelState");
      const DeletePanelState = /* @__PURE__ */ __name((Handle) => Effect.gen(function* () {
        StateCache.delete(Handle);
        void GetMountainClient()?.sendRequest("Storage.Set", [
          StorageKey(Handle),
          null
        ]).catch(() => void 0);
      }), "DeletePanelState");
      const GetAllPanelStates = /* @__PURE__ */ __name((ExtensionId) => Effect.gen(function* () {
        return Array.from(StateCache.values()).filter(
          (State) => State.ExtensionId === ExtensionId
        );
      }), "GetAllPanelStates");
      const ClearAllPanelStates = /* @__PURE__ */ __name(() => Effect.gen(function* () {
        const Handles = Array.from(StateCache.keys());
        StateCache.clear();
        const Client = GetMountainClient();
        for (const Handle of Handles) {
          void Client?.sendRequest("Storage.Set", [
            StorageKey(Handle),
            null
          ]).catch(() => void 0);
        }
      }), "ClearAllPanelStates");
      return {
        SavePanelState,
        RestorePanelState,
        DeletePanelState,
        GetAllPanelStates,
        ClearAllPanelStates
      };
    })
  }
) {
  static {
    __name(this, "StateService");
  }
};
export {
  StateService
};
//# sourceMappingURL=State.js.map
