var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI } from "../Type/ExtHostTypes.js";
function SerializeFilters(filters) {
  if (!filters) {
    return void 0;
  }
  return Object.entries(filters).map(([Name, Extensions]) => ({
    Name,
    Extensions
  }));
}
__name(SerializeFilters, "SerializeFilters");
var OpenDialogOption;
((OpenDialogOption2) => {
  function ToDTO(Option) {
    if (!Option) {
      return void 0;
    }
    return {
      ...Option,
      defaultUri: Option.defaultUri?.toJSON(),
      filters: SerializeFilters(Option.filters)
    };
  }
  OpenDialogOption2.ToDTO = ToDTO;
  __name(ToDTO, "ToDTO");
})(OpenDialogOption || (OpenDialogOption = {}));
var SaveDialogOption;
((SaveDialogOption2) => {
  function ToDTO(Option) {
    if (!Option) {
      return void 0;
    }
    return {
      ...Option,
      defaultUri: Option.defaultUri?.toJSON(),
      filters: SerializeFilters(Option.filters)
    };
  }
  SaveDialogOption2.ToDTO = ToDTO;
  __name(ToDTO, "ToDTO");
})(SaveDialogOption || (SaveDialogOption = {}));
var DialogResult;
((DialogResult2) => {
  function ToURI(DTO) {
    if (!DTO) {
      return void 0;
    }
    return URI.revive(DTO);
  }
  DialogResult2.ToURI = ToURI;
  __name(ToURI, "ToURI");
  function ToURIArray(DTOs) {
    if (!DTOs || !Array.isArray(DTOs)) {
      return void 0;
    }
    return DTOs.map(ToURI).filter((u) => !!u);
  }
  DialogResult2.ToURIArray = ToURIArray;
  __name(ToURIArray, "ToURIArray");
})(DialogResult || (DialogResult = {}));
export {
  DialogResult,
  OpenDialogOption,
  SaveDialogOption
};
//# sourceMappingURL=Dialog.js.map
