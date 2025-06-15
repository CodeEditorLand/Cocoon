var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import {
  MarkdownString as MarkdownStringConverter,
  Range as RangeConverter,
  TextEdit as TextEditConverter
} from "./Main.js";
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
      label: typeof Item.label === "string" ? Item.label : Item.label,
      kind: Item.kind,
      tags: Item.tags,
      detail: Item.detail,
      documentation: Item.documentation ? MarkdownStringConverter.FromAPI(
        Item.documentation
      ) : void 0,
      sortText: Item.sortText,
      filterText: Item.filterText,
      preselect: Item.preselect,
      insertText: Item.insertText instanceof ExtHostTypes.SnippetString ? Item.insertText : Item.insertText,
      insertTextRules: Item.insertText instanceof ExtHostTypes.SnippetString ? Languages.CompletionItemInsertTextRule.InsertAsSnippet : 0,
      range: Item.range instanceof ExtHostTypes.Range ? RangeConverter.FromAPI(Item.range) : Item.range ? {
        insert: RangeConverter.FromAPI(
          Item.range.insert
        ),
        replace: RangeConverter.FromAPI(
          Item.range.replace
        )
      } : void 0,
      additionalTextEdits: Item.additionalTextEdits?.map(
        TextEditConverter.FromAPI
      ),
      command: Item.command ? CommandsConverter.ToInternal(Item.command, Disposables) : void 0
    };
  }, "FromAPI"),
  ToAPI: /* @__PURE__ */ __name((DTO, CommandsConverter) => {
    const Label = typeof DTO.label === "string" ? DTO.label : {
      label: DTO.label.label,
      detail: DTO.label.detail,
      description: DTO.label.description
    };
    const Item = new ExtHostTypes.CompletionItem(
      Label,
      DTO.kind
    );
    Item.tags = DTO.tags;
    Item.detail = DTO.detail;
    Item.documentation = typeof DTO.documentation === "string" ? DTO.documentation : MarkdownStringConverter.ToAPI(DTO.documentation);
    Item.sortText = DTO.sortText;
    Item.filterText = DTO.filterText;
    Item.preselect = DTO.preselect;
    Item.insertText = DTO.insertText;
    Item.range = DTO.range ? "insert" in DTO.range ? {
      insert: RangeConverter.ToAPI(DTO.range.insert),
      replace: RangeConverter.ToAPI(DTO.range.replace)
    } : RangeConverter.ToAPI(DTO.range) : void 0;
    Item.commitCharacters = DTO.commitCharacters;
    Item.additionalTextEdits = DTO.additionalTextEdits?.map(
      TextEditConverter.ToAPI
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
    const Items = Array.isArray(List) ? List : List.items;
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
