var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/WebviewPanel/Serializer.ts
import { Effect } from "effect";
var DTO_VERSION = 1;
var SerializerService = class extends Effect.Service()(
  "Serializer/WebviewPanel",
  {
    effect: Effect.gen(function* () {
      const ValidateDTO = /* @__PURE__ */ __name((DTO) => Effect.gen(function* () {
        if (typeof DTO !== "object" || DTO === null || Array.isArray(DTO)) {
          return yield* Effect.fail(
            new Error("Mountain DTO must be an object")
          );
        }
        const D = DTO;
        if (typeof D.Version !== "number") {
          return yield* Effect.fail(
            new Error("Mountain DTO missing Version")
          );
        }
        if (typeof D.Handle !== "string") {
          return yield* Effect.fail(
            new Error("Mountain DTO missing Handle")
          );
        }
        if (typeof D.ExtensionId !== "string") {
          return yield* Effect.fail(
            new Error("Mountain DTO missing ExtensionId")
          );
        }
        if (typeof D.ViewType !== "string") {
          return yield* Effect.fail(
            new Error("Mountain DTO missing ViewType")
          );
        }
        if (typeof D.Title !== "string") {
          return yield* Effect.fail(
            new Error("Mountain DTO missing Title")
          );
        }
        if (typeof D.ViewColumn !== "number") {
          return yield* Effect.fail(
            new Error("Mountain DTO has invalid ViewColumn")
          );
        }
        if (typeof D.PreservedFocus !== "boolean") {
          return yield* Effect.fail(
            new Error(
              "Mountain DTO has invalid PreservedFocus"
            )
          );
        }
        if (typeof D.IsActive !== "boolean") {
          return yield* Effect.fail(
            new Error("Mountain DTO has invalid IsActive")
          );
        }
        if (typeof D.IsVisible !== "boolean") {
          return yield* Effect.fail(
            new Error("Mountain DTO has invalid IsVisible")
          );
        }
        if (typeof D.Options !== "object" || D.Options === null || Array.isArray(D.Options)) {
          return yield* Effect.fail(
            new Error("Mountain DTO has invalid Options")
          );
        }
        const Options = D.Options;
        if (typeof Options.EnableScripts !== "undefined" && typeof Options.EnableScripts !== "boolean") {
          return yield* Effect.fail(
            new Error(
              "Mountain DTO has invalid EnableScripts option"
            )
          );
        }
        return D;
      }), "ValidateDTO");
      const SerializeToDTO = /* @__PURE__ */ __name((State) => Effect.gen(function* () {
        const DTO = {
          Version: DTO_VERSION,
          Handle: State.Handle,
          ExtensionId: State.ExtensionId,
          ViewType: State.ViewType,
          Title: State.Title,
          ViewColumn: State.Position.ViewColumn,
          PreservedFocus: State.Position.PreservedFocus,
          IsActive: State.ViewState.Active,
          IsVisible: State.ViewState.Visible,
          Options: {
            EnableScripts: State.Options.EnableScripts,
            RetainContextWhenHidden: State.Options.RetainContextWhenHidden,
            EnableFindWidget: State.Options.EnableFindWidget,
            LocalResourceRoots: State.Options.LocalResourceRoots,
            PortMapping: State.Options.PortMapping
          },
          IconPath: State.IconPath,
          Content: State.Content,
          Metadata: State.Metadata
        };
        return DTO;
      }), "SerializeToDTO");
      const DeserializeFromDTO = /* @__PURE__ */ __name((DTO) => Effect.gen(function* () {
        const ValidatedDTO = yield* ValidateDTO(DTO);
        const State = {
          Version: ValidatedDTO.Version,
          Handle: ValidatedDTO.Handle,
          ExtensionId: ValidatedDTO.ExtensionId,
          ViewType: ValidatedDTO.ViewType,
          Title: ValidatedDTO.Title,
          Position: {
            ViewColumn: ValidatedDTO.ViewColumn,
            PreservedFocus: ValidatedDTO.PreservedFocus
          },
          ViewState: {
            Active: ValidatedDTO.IsActive,
            Visible: ValidatedDTO.IsVisible,
            ViewColumn: ValidatedDTO.ViewColumn
          },
          Options: {
            EnableScripts: ValidatedDTO.Options.EnableScripts,
            RetainContextWhenHidden: ValidatedDTO.Options.RetainContextWhenHidden,
            EnableFindWidget: ValidatedDTO.Options.EnableFindWidget,
            LocalResourceRoots: ValidatedDTO.Options.LocalResourceRoots,
            PortMapping: ValidatedDTO.Options.PortMapping
          },
          IconPath: ValidatedDTO.IconPath,
          Content: ValidatedDTO.Content,
          Metadata: ValidatedDTO.Metadata
        };
        return State;
      }), "DeserializeFromDTO");
      return {
        SerializeToDTO,
        DeserializeFromDTO,
        ValidateDTO
      };
    })
  }
) {
  static {
    __name(this, "SerializerService");
  }
};
export {
  SerializerService
};
//# sourceMappingURL=Serializer.js.map
