var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import MarkdownStringConverter from "./Main/MarkdownString.js";
import RangeConverter from "./Main/Range.js";
import TextEditConverter from "./Main/TextEdit.js";
const CompletionContext = {
  ToAPI: /* @__PURE__ */ __name((DTO) => {
    return {
      triggerKind: DTO.triggerKind,
      triggerCharacter: DTO.triggerCharacter
    };
  }, "ToAPI")
};
const CompletionItem = {
  FromAPI: /* @__PURE__ */ __name((Item, CommandsConverter, Disposables) => {
    return {
      label: Item.label,
      kind: Item.kind,
      tags: Item.tags,
      detail: Item.detail,
      documentation: typeof Item.documentation === "string" ? Item.documentation : Item.documentation instanceof ExtHostTypes.MarkdownString ? MarkdownStringConverter.FromAPI(Item.documentation) : void 0,
      sortText: Item.sortText,
      filterText: Item.filterText,
      preselect: Item.preselect,
      insertText: Item.insertText instanceof ExtHostTypes.SnippetString ? Item.insertText.value : Item.insertText,
      insertTextRules: Item.insertText instanceof ExtHostTypes.SnippetString ? Languages.CompletionItemInsertTextRule.InsertAsSnippet : 0,
      range: Item.range instanceof ExtHostTypes.Range ? RangeConverter.FromAPI(Item.range) : Item.range ? {
        insert: RangeConverter.FromAPI(
          Item.range.inserting
        ),
        replace: RangeConverter.FromAPI(
          Item.range.replacing
        )
      } : void 0,
      commitCharacters: Item.commitCharacters,
      additionalTextEdits: Item.additionalTextEdits?.map(
        (edit) => TextEditConverter.FromAPI(edit)
      ),
      command: Item.command ? CommandsConverter.ToInternal(Item.command, Disposables) : void 0
    };
  }, "FromAPI"),
  ToAPI: /* @__PURE__ */ __name((DTO, CommandsConverter) => {
    const Label = DTO.label;
    const Item = new ExtHostTypes.CompletionItem(
      Label,
      DTO.kind
    );
    Item.tags = DTO.tags;
    Item.detail = DTO.detail;
    Item.documentation = typeof DTO.documentation === "string" ? DTO.documentation : DTO.documentation ? MarkdownStringConverter.ToAPI(DTO.documentation) : void 0;
    Item.sortText = DTO.sortText;
    Item.filterText = DTO.filterText;
    Item.preselect = DTO.preselect;
    Item.insertText = DTO.insertText;
    Item.range = DTO.range ? "insert" in DTO.range ? {
      inserting: RangeConverter.ToAPI(DTO.range.insert),
      replacing: RangeConverter.ToAPI(DTO.range.replace)
    } : RangeConverter.ToAPI(DTO.range) : void 0;
    Item.commitCharacters = DTO.commitCharacters;
    Item.additionalTextEdits = DTO.additionalTextEdits?.map(
      (dto) => TextEditConverter.ToAPI(dto)
    );
    Item.command = DTO.command ? CommandsConverter.FromInternal(DTO.command) : void 0;
    return Item;
  }, "ToAPI")
};
const CompletionList = {
  FromAPI: /* @__PURE__ */ __name((List, CommandsConverter, Disposables) => {
    if (!List) {
      return void 0;
    }
    const Items = "items" in List ? List.items : List;
    return {
      suggestions: Items.map(
        (Item) => CompletionItem.FromAPI(Item, CommandsConverter, Disposables)
      ),
      incomplete: "isIncomplete" in List ? !!List.isIncomplete : false
    };
  }, "FromAPI")
};
var Completion_default = {
  CompletionContext,
  CompletionItem,
  CompletionList
};
export {
  Completion_default as default
};
//# sourceMappingURL=Completion.js.map
