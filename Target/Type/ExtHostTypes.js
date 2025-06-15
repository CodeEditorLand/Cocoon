var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import { CancellationError as VscCancellationError } from "vs/base/common/errors.js";
import * as Emitter from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI as VscURI } from "vs/base/common/uri.js";
const Disposable = Lifecycle.Disposable;
const CancellationTokenSource = VscCancellationTokenSource;
const CancellationError = VscCancellationError;
const EventEmitter = Emitter.Emitter;
const URI = VscURI;
class Position {
  static {
    __name(this, "Position");
  }
  line;
  character;
  constructor(Line, Character) {
    if (Line < 0) {
      throw new Error("Illegal argument: line must be non-negative");
    }
    if (Character < 0) {
      throw new Error("Illegal argument: character must be non-negative");
    }
    this.line = Line;
    this.character = Character;
  }
  isBefore(Other) {
    return this.line < Other.line || this.line === Other.line && this.character < Other.character;
  }
  isBeforeOrEqual(Other) {
    return this.line < Other.line || this.line === Other.line && this.character <= Other.character;
  }
  isAfter(Other) {
    return !this.isBeforeOrEqual(Other);
  }
  isAfterOrEqual(Other) {
    return !this.isBefore(Other);
  }
  isEqual(Other) {
    return this.line === Other.line && this.character === Other.character;
  }
  compareTo(Other) {
    if (this.line < Other.line) {
      return -1;
    }
    if (this.line > Other.line) {
      return 1;
    }
    if (this.character < Other.character) {
      return -1;
    }
    if (this.character > Other.character) {
      return 1;
    }
    return 0;
  }
  translate(LineDelta, CharacterDelta) {
    return new Position(
      this.line + (LineDelta ?? 0),
      this.character + (CharacterDelta ?? 0)
    );
  }
  with(Line, Character) {
    return new Position(Line ?? this.line, Character ?? this.character);
  }
  toJSON() {
    return { line: this.line, character: this.character };
  }
}
class Range {
  static {
    __name(this, "Range");
  }
  start;
  end;
  constructor(Start, End) {
    if (Start.isAfter(End)) {
      this.start = End;
      this.end = Start;
    } else {
      this.start = Start;
      this.end = End;
    }
  }
  get isEmpty() {
    return this.start.isEqual(this.end);
  }
  get isSingleLine() {
    return this.start.line === this.end.line;
  }
  contains(PositionOrRange) {
    if (PositionOrRange instanceof Range) {
      return this.contains(PositionOrRange.start) && this.contains(PositionOrRange.end);
    }
    return PositionOrRange.isAfterOrEqual(this.start) && PositionOrRange.isBeforeOrEqual(this.end);
  }
  isEqual(Other) {
    return this.start.isEqual(Other.start) && this.end.isEqual(Other.end);
  }
  intersection(Other) {
    const Start = this.start.isAfter(Other.start) ? this.start : Other.start;
    const End = this.end.isBefore(Other.end) ? this.end : Other.end;
    if (Start.isAfter(End)) {
      return void 0;
    }
    return new Range(Start, End);
  }
  union(Other) {
    const Start = this.start.isBefore(Other.start) ? this.start : Other.start;
    const End = this.end.isAfter(Other.end) ? this.end : Other.end;
    return new Range(Start, End);
  }
  with(Start, End) {
    return new Range(Start ?? this.start, End ?? this.end);
  }
  toJSON() {
    return [this.start, this.end];
  }
}
class Selection extends Range {
  static {
    __name(this, "Selection");
  }
  anchor;
  active;
  constructor(Anchor, Active) {
    super(Anchor, Active);
    this.anchor = Anchor;
    this.active = Active;
  }
  get isReversed() {
    return this.active.isBefore(this.anchor);
  }
  toJSON() {
    return {
      start: this.start,
      end: this.end,
      active: this.active,
      anchor: this.anchor
    };
  }
}
class Location {
  constructor(uri, range) {
    this.uri = uri;
    this.range = range;
  }
  static {
    __name(this, "Location");
  }
  toJSON() {
    return {
      uri: this.uri,
      range: this.range
    };
  }
}
class Diagnostic {
  static {
    __name(this, "Diagnostic");
  }
  range;
  message;
  severity;
  source;
  code;
  relatedInformation;
  tags;
  constructor(Range2, Message, Severity = VscDiagnosticSeverity.Error) {
    this.range = Range2;
    this.message = Message;
    this.severity = Severity;
  }
  toJSON() {
    return {
      message: this.message,
      severity: VscDiagnosticSeverity[this.severity],
      range: this.range
    };
  }
}
class DiagnosticRelatedInformation {
  constructor(location, message) {
    this.location = location;
    this.message = message;
  }
  static {
    __name(this, "DiagnosticRelatedInformation");
  }
}
class TreeItem {
  static {
    __name(this, "TreeItem");
  }
  label;
  resourceURI;
  collapsibleState;
  constructor(LabelOrUri, CollapsibleState) {
    if (typeof LabelOrUri === "string") {
      this.label = LabelOrUri;
    } else {
      this.resourceURI = LabelOrUri;
    }
    this.collapsibleState = CollapsibleState;
  }
}
class MarkdownString {
  static {
    __name(this, "MarkdownString");
  }
  value;
  isTrusted;
  supportThemeIcons;
  supportHtml;
  baseUri;
  constructor(Value = "", IsTrusted = false) {
    this.value = Value;
    this.isTrusted = IsTrusted;
  }
  appendText(Value) {
    this.value += Value;
    return this;
  }
  appendMarkdown(Value) {
    this.value += Value;
    return this;
  }
  appendCodeblock(Value, Language = "") {
    this.value += `
\`\`\`${Language}
${Value}
\`\`\`
`;
    return this;
  }
  toJSON() {
    return {
      value: this.value,
      isTrusted: this.isTrusted
    };
  }
}
class ThemeColor {
  constructor(id) {
    this.id = id;
  }
  static {
    __name(this, "ThemeColor");
  }
}
class ThemeIcon {
  constructor(id, color) {
    this.id = id;
    this.color = color;
  }
  static {
    __name(this, "ThemeIcon");
  }
  static File = new ThemeIcon("file");
  static Folder = new ThemeIcon("folder");
}
class TextEdit {
  constructor(range, newText) {
    this.range = range;
    this.newText = newText;
  }
  static {
    __name(this, "TextEdit");
  }
}
class CompletionItem extends VscCompletionItem {
  static {
    __name(this, "CompletionItem");
  }
}
class SnippetString extends VscSnippetString {
  static {
    __name(this, "SnippetString");
  }
}
var ViewColumn = /* @__PURE__ */ ((ViewColumn2) => {
  ViewColumn2[ViewColumn2["Active"] = -1] = "Active";
  ViewColumn2[ViewColumn2["Beside"] = -2] = "Beside";
  ViewColumn2[ViewColumn2["One"] = 1] = "One";
  ViewColumn2[ViewColumn2["Two"] = 2] = "Two";
  ViewColumn2[ViewColumn2["Three"] = 3] = "Three";
  ViewColumn2[ViewColumn2["Four"] = 4] = "Four";
  ViewColumn2[ViewColumn2["Five"] = 5] = "Five";
  ViewColumn2[ViewColumn2["Six"] = 6] = "Six";
  ViewColumn2[ViewColumn2["Seven"] = 7] = "Seven";
  ViewColumn2[ViewColumn2["Eight"] = 8] = "Eight";
  ViewColumn2[ViewColumn2["Nine"] = 9] = "Nine";
  return ViewColumn2;
})(ViewColumn || {});
var StatusBarAlignment = /* @__PURE__ */ ((StatusBarAlignment2) => {
  StatusBarAlignment2[StatusBarAlignment2["Left"] = 1] = "Left";
  StatusBarAlignment2[StatusBarAlignment2["Right"] = 2] = "Right";
  return StatusBarAlignment2;
})(StatusBarAlignment || {});
var FileType = /* @__PURE__ */ ((FileType2) => {
  FileType2[FileType2["Unknown"] = 0] = "Unknown";
  FileType2[FileType2["File"] = 1] = "File";
  FileType2[FileType2["Directory"] = 2] = "Directory";
  FileType2[FileType2["SymbolicLink"] = 64] = "SymbolicLink";
  return FileType2;
})(FileType || {});
var TextEditorCursorStyle = /* @__PURE__ */ ((TextEditorCursorStyle2) => {
  TextEditorCursorStyle2[TextEditorCursorStyle2["Line"] = 1] = "Line";
  TextEditorCursorStyle2[TextEditorCursorStyle2["Block"] = 2] = "Block";
  TextEditorCursorStyle2[TextEditorCursorStyle2["Underline"] = 3] = "Underline";
  TextEditorCursorStyle2[TextEditorCursorStyle2["LineThin"] = 4] = "LineThin";
  TextEditorCursorStyle2[TextEditorCursorStyle2["BlockOutline"] = 5] = "BlockOutline";
  TextEditorCursorStyle2[TextEditorCursorStyle2["UnderlineThin"] = 6] = "UnderlineThin";
  return TextEditorCursorStyle2;
})(TextEditorCursorStyle || {});
var DiagnosticSeverity = /* @__PURE__ */ ((DiagnosticSeverity2) => {
  DiagnosticSeverity2[DiagnosticSeverity2["Error"] = 0] = "Error";
  DiagnosticSeverity2[DiagnosticSeverity2["Warning"] = 1] = "Warning";
  DiagnosticSeverity2[DiagnosticSeverity2["Information"] = 2] = "Information";
  DiagnosticSeverity2[DiagnosticSeverity2["Hint"] = 3] = "Hint";
  return DiagnosticSeverity2;
})(DiagnosticSeverity || {});
var TreeItemCollapsibleState = /* @__PURE__ */ ((TreeItemCollapsibleState2) => {
  TreeItemCollapsibleState2[TreeItemCollapsibleState2["None"] = 0] = "None";
  TreeItemCollapsibleState2[TreeItemCollapsibleState2["Collapsed"] = 1] = "Collapsed";
  TreeItemCollapsibleState2[TreeItemCollapsibleState2["Expanded"] = 2] = "Expanded";
  return TreeItemCollapsibleState2;
})(TreeItemCollapsibleState || {});
var ConfigurationTarget = /* @__PURE__ */ ((ConfigurationTarget2) => {
  ConfigurationTarget2[ConfigurationTarget2["Global"] = 1] = "Global";
  ConfigurationTarget2[ConfigurationTarget2["WorkSpace"] = 2] = "WorkSpace";
  ConfigurationTarget2[ConfigurationTarget2["WorkSpaceFolder"] = 3] = "WorkSpaceFolder";
  return ConfigurationTarget2;
})(ConfigurationTarget || {});
var EndOfLine = /* @__PURE__ */ ((EndOfLine2) => {
  EndOfLine2[EndOfLine2["LF"] = 1] = "LF";
  EndOfLine2[EndOfLine2["CRLF"] = 2] = "CRLF";
  return EndOfLine2;
})(EndOfLine || {});
var ProgressLocation = /* @__PURE__ */ ((ProgressLocation2) => {
  ProgressLocation2[ProgressLocation2["SourceControl"] = 1] = "SourceControl";
  ProgressLocation2[ProgressLocation2["Window"] = 10] = "Window";
  ProgressLocation2[ProgressLocation2["Notification"] = 15] = "Notification";
  return ProgressLocation2;
})(ProgressLocation || {});
var QuickPickItemKind = /* @__PURE__ */ ((QuickPickItemKind2) => {
  QuickPickItemKind2[QuickPickItemKind2["Separator"] = -1] = "Separator";
  QuickPickItemKind2[QuickPickItemKind2["Default"] = 0] = "Default";
  return QuickPickItemKind2;
})(QuickPickItemKind || {});
const CompletionItemKind = VscCompletionItemKind;
export {
  CancellationError,
  CancellationTokenSource,
  CompletionItem,
  CompletionItemKind,
  ConfigurationTarget,
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Disposable,
  EndOfLine,
  EventEmitter,
  FileType,
  Location,
  MarkdownString,
  Position,
  ProgressLocation,
  QuickPickItemKind,
  Range,
  Selection,
  SnippetString,
  StatusBarAlignment,
  TextEdit,
  TextEditorCursorStyle,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  URI,
  ViewColumn
};
//# sourceMappingURL=ExtHostTypes.js.map
