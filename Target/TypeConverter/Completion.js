var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as MarkdownStringConverter from "./Main/MarkdownString.js";
import * as RangeConverter from "./Main/Range.js";
import * as TextEditConverter from "./Main/TextEdit.js";
var CompletionItemKind;
((CompletionItemKind2) => {
  function FromAPI(kind) {
    return kind ?? Languages.CompletionItemKind.Text;
  }
  CompletionItemKind2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
  function ToAPI(kind) {
    return kind;
  }
  CompletionItemKind2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CompletionItemKind || (CompletionItemKind = {}));
var CompletionItemTag;
((CompletionItemTag2) => {
  function FromAPI(tag) {
    return tag;
  }
  CompletionItemTag2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
  function ToAPI(tag) {
    return tag;
  }
  CompletionItemTag2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CompletionItemTag || (CompletionItemTag = {}));
var CompletionContext;
((CompletionContext2) => {
  function ToAPI(DTO) {
    return {
      triggerKind: DTO.triggerKind,
      triggerCharacter: DTO.triggerCharacter
    };
  }
  CompletionContext2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CompletionContext || (CompletionContext = {}));
var CompletionItem;
((CompletionItem2) => {
  function FromAPI(Item, CommandsConverter, Disposables) {
    return {
      label: typeof Item.label === "string" ? Item.label : Item.label,
      kind: CompletionItemKind.FromAPI(Item.kind),
      tags: Item.tags?.map(CompletionItemTag.FromAPI),
      detail: Item.detail,
      documentation: Item.documentation ? MarkdownStringConverter.FromAPI(Item.documentation) : void 0,
      sortText: Item.sortText,
      filterText: Item.filterText,
      preselect: Item.preselect,
      insertText: typeof Item.insertText === "string" ? Item.insertText : Item.insertText?.value,
      insertTextRules: typeof Item.insertText !== "string" ? Languages.CompletionItemInsertTextRule.InsertAsSnippet : 0,
      range: Item.range ? RangeConverter.FromAPI(Item.range) : void 0,
      commitCharacters: Item.commitCharacters,
      additionalTextEdits: Item.additionalTextEdits?.map(
        TextEditConverter.FromAPI
      ),
      command: Item.command ? CommandsConverter.ToInternal(
        Item.command,
        Disposables
      ) : void 0
    };
  }
  CompletionItem2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
  function ToAPI(DTO, CommandsConverter) {
    const label = typeof DTO.label === "string" ? DTO.label : {
      label: DTO.label.label,
      detail: DTO.label.detail,
      description: DTO.label.description
    };
    const item = new ExtHostTypes.CompletionItem(
      label,
      CompletionItemKind.ToAPI(DTO.kind)
    );
    item.tags = DTO.tags?.map(CompletionItemTag.ToAPI);
    item.detail = DTO.detail;
    item.documentation = DTO.documentation ? MarkdownStringConverter.ToAPI(DTO.documentation) : void 0;
    item.sortText = DTO.sortText;
    item.filterText = DTO.filterText;
    item.preselect = DTO.preselect;
    if (DTO.insertTextRules && DTO.insertTextRules & Languages.CompletionItemInsertTextRule.InsertAsSnippet) {
      item.insertText = new ExtHostTypes.SnippetString(
        DTO.insertText
      );
    } else {
      item.insertText = DTO.insertText;
    }
    item.range = DTO.range ? RangeConverter.ToAPI(DTO.range) : void 0;
    item.commitCharacters = DTO.commitCharacters;
    item.additionalTextEdits = DTO.additionalTextEdits?.map(
      TextEditConverter.ToAPI
    );
    item.command = DTO.command ? CommandsConverter.FromInternal(DTO.command) : void 0;
    return item;
  }
  CompletionItem2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(CompletionItem || (CompletionItem = {}));
var CompletionList;
((CompletionList2) => {
  function FromAPI(List, CommandsConverter, Disposables) {
    if (!List) {
      return void 0;
    }
    const items = Array.isArray(List) ? List : List.items;
    return {
      suggestions: items.map(
        (item) => CompletionItem.FromAPI(item, CommandsConverter, Disposables)
      ),
      incomplete: !Array.isArray(List) ? List.isIncomplete : false
      // duration is an internal property and not part of the public API
    };
  }
  CompletionList2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
})(CompletionList || (CompletionList = {}));
export {
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  CompletionList
};
//# sourceMappingURL=Completion.js.map
