var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { DisposableStore } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Commands as CommandsConverter } from "./Commands/mod.js";
import {
  MarkdownString as MarkdownStringConverter,
  Range as RangeConverter,
  TextEdit as TextEditConverter
} from "./Main.js";
var CompletionItemKind;
((CompletionItemKind2) => {
  CompletionItemKind2.fromApi = /* @__PURE__ */ __name((kind) => {
    return kind ?? Languages.CompletionItemKind.Text;
  }, "fromApi");
  CompletionItemKind2.toApi = /* @__PURE__ */ __name((kind) => {
    return kind;
  }, "toApi");
})(CompletionItemKind || (CompletionItemKind = {}));
var CompletionItemTag;
((CompletionItemTag2) => {
  CompletionItemTag2.fromApi = /* @__PURE__ */ __name((tag) => tag, "fromApi");
  CompletionItemTag2.toApi = /* @__PURE__ */ __name((tag) => tag, "toApi");
})(CompletionItemTag || (CompletionItemTag = {}));
var CompletionContext;
((CompletionContext2) => {
  CompletionContext2.toApi = /* @__PURE__ */ __name((dto) => ({
    triggerKind: dto.triggerKind,
    triggerCharacter: dto.triggerCharacter
  }), "toApi");
})(CompletionContext || (CompletionContext = {}));
var CompletionItem;
((CompletionItem2) => {
  CompletionItem2.fromApi = /* @__PURE__ */ __name((item, commandsConverter, disposables) => {
    return {
      label: typeof item.label === "string" ? item.label : item.label,
      kind: CompletionItemKind.fromApi(item.kind),
      tags: item.tags?.map(CompletionItemTag.fromApi),
      detail: item.detail,
      documentation: item.documentation ? MarkdownStringConverter.fromApi(item.documentation) : void 0,
      sortText: item.sortText,
      filterText: item.filterText,
      preselect: item.preselect,
      insertText: typeof item.insertText === "string" ? item.insertText : item.insertText?.value,
      insertTextRules: typeof item.insertText !== "string" ? Languages.CompletionItemInsertTextRule.InsertAsSnippet : 0,
      range: item.range ? RangeConverter.fromApi(item.range) : void 0,
      commitCharacters: item.commitCharacters,
      additionalTextEdits: item.additionalTextEdits?.map(
        TextEditConverter.fromApi
      ),
      command: item.command ? commandsConverter.ToInternal(
        item.command,
        disposables
      ) : void 0
    };
  }, "fromApi");
  CompletionItem2.toApi = /* @__PURE__ */ __name((dto, commandsConverter) => {
    const label = typeof dto.label === "string" ? dto.label : {
      label: dto.label.label,
      detail: dto.label.detail,
      description: dto.label.description
    };
    const item = new ExtHostTypes.CompletionItem(
      label,
      CompletionItemKind.toApi(dto.kind)
    );
    item.tags = dto.tags?.map(CompletionItemTag.toApi);
    item.detail = dto.detail;
    item.documentation = dto.documentation ? MarkdownStringConverter.toApi(dto.documentation) : void 0;
    item.sortText = dto.sortText;
    item.filterText = dto.filterText;
    item.preselect = dto.preselect;
    if (dto.insertTextRules && dto.insertTextRules & Languages.CompletionItemInsertTextRule.InsertAsSnippet) {
      item.insertText = new ExtHostTypes.SnippetString(
        dto.insertText
      );
    } else {
      item.insertText = dto.insertText;
    }
    item.range = dto.range ? RangeConverter.toApi(dto.range) : void 0;
    item.commitCharacters = dto.commitCharacters;
    item.additionalTextEdits = dto.additionalTextEdits?.map(
      TextEditConverter.toApi
    );
    item.command = dto.command ? commandsConverter.FromInternal(dto.command) : void 0;
    return item;
  }, "toApi");
})(CompletionItem || (CompletionItem = {}));
var CompletionList;
((CompletionList2) => {
  CompletionList2.fromApi = /* @__PURE__ */ __name((list, commandsConverter, disposables) => {
    if (!list) return void 0;
    const items = Array.isArray(list) ? list : list.items;
    return {
      suggestions: items.map(
        (item) => CompletionItem.fromApi(item, commandsConverter, disposables)
      ),
      incomplete: !Array.isArray(list) ? list.isIncomplete : false
      // duration is not part of the public API
    };
  }, "fromApi");
})(CompletionList || (CompletionList = {}));
export {
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  CompletionList
};
//# sourceMappingURL=Completion.js.map
