var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import * as Emitter from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI as VscURI } from "vs/base/common/uri.js";
const Disposable = Lifecycle.Disposable;
const CancellationTokenSource = VscCancellationTokenSource;
const CancellationError = Emitter.CancellationError;
const EventEmitter = Emitter.Emitter;
const URI = VscURI;
class Position {
  static {
    __name(this, "Position");
  }
  line;
  character;
  constructor(line, character) {
    if (line < 0) {
      throw new Error("Illegal argument: line must be non-negative");
    }
    if (character < 0) {
      throw new Error("Illegal argument: character must be non-negative");
    }
    this.line = line;
    this.character = character;
  }
  isBefore(other) {
    return this.line < other.line || this.line === other.line && this.character < other.character;
  }
  isBeforeOrEqual(other) {
    return this.line < other.line || this.line === other.line && this.character <= other.character;
  }
  isAfter(other) {
    return !this.isBeforeOrEqual(other);
  }
  isAfterOrEqual(other) {
    return !this.isBefore(other);
  }
  isEqual(other) {
    return this.line === other.line && this.character === other.character;
  }
  compareTo(other) {
    if (this.line < other.line) {
      return -1;
    }
    if (this.line > other.line) {
      return 1;
    }
    if (this.character < other.character) {
      return -1;
    }
    if (this.character > other.character) {
      return 1;
    }
    return 0;
  }
  translate(lineDelta, characterDelta) {
    return new Position(
      this.line + (lineDelta ?? 0),
      this.character + (characterDelta ?? 0)
    );
  }
  with(line, character) {
    return new Position(line ?? this.line, character ?? this.character);
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
  constructor(start, end) {
    if (start.isAfter(end)) {
      this.start = end;
      this.end = start;
    } else {
      this.start = start;
      this.end = end;
    }
  }
  get isEmpty() {
    return this.start.isEqual(this.end);
  }
  get isSingleLine() {
    return this.start.line === this.end.line;
  }
  contains(positionOrRange) {
    if (positionOrRange instanceof Range) {
      return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    return positionOrRange.isAfterOrEqual(this.start) && positionOrRange.isBeforeOrEqual(this.end);
  }
  isEqual(other) {
    return this.start.isEqual(other.start) && this.end.isEqual(other.end);
  }
  intersection(other) {
    const start = this.start.isAfter(other.start) ? this.start : other.start;
    const end = this.end.isBefore(other.end) ? this.end : other.end;
    if (start.isAfter(end)) {
      return void 0;
    }
    return new Range(start, end);
  }
  union(other) {
    const start = this.start.isBefore(other.start) ? this.start : other.start;
    const end = this.end.isAfter(other.end) ? this.end : other.end;
    return new Range(start, end);
  }
  with(start, end) {
    return new Range(start ?? this.start, end ?? this.end);
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
  constructor(anchor, active) {
    super(anchor, active);
    this.anchor = anchor;
    this.active = active;
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
  constructor(range, message, severity = 0 /* Error */) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
  toJSON() {
    return {
      message: this.message,
      severity: DiagnosticSeverity[this.severity],
      range: this.range
    };
  }
}
class TreeItem {
  static {
    __name(this, "TreeItem");
  }
  label;
  resourceURI;
  collapsibleState;
  constructor(labelOrUri, collapsibleState) {
    if (typeof labelOrUri === "string") {
      this.label = labelOrUri;
    } else {
      this.resourceURI = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}
class MarkdownString {
  static {
    __name(this, "MarkdownString");
  }
  value;
  isTrusted;
  constructor(value = "", isTrusted = false) {
    this.value = value;
    this.isTrusted = isTrusted;
  }
  append(value) {
    this.value += value;
    return this;
  }
  appendCodeblock(language, value) {
    this.value += `
\`\`\`${language}
${value}
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
export {
  CancellationError,
  CancellationTokenSource,
  ConfigurationTarget,
  Diagnostic,
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
  StatusBarAlignment,
  TextEditorCursorStyle,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  URI,
  ViewColumn
};
//# sourceMappingURL=ExtHostTypes.js.map
