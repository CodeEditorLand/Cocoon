var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import * as Emitter from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI } from "vs/base/common/uri.js";
const Disposable = Lifecycle.Disposable;
const CancellationTokenSource = VscCancellationTokenSource;
const CancellationError = Emitter.CancellationError;
const EventEmitter = Emitter.Emitter;
const Uri = URI;
class Position {
  static {
    __name(this, "Position");
  }
  line;
  character;
  constructor(line, character) {
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
    return 0;
  }
  translate(lineDelta = 0, characterDelta = 0) {
    return new Position(
      this.line + lineDelta,
      this.character + characterDelta
    );
  }
  with(line, character) {
    return new Position(line ?? this.line, character ?? this.character);
  }
}
class Range {
  static {
    __name(this, "Range");
  }
  start;
  end;
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  get isEmpty() {
    return this.start.isEqual(this.end);
  }
  get isSingleLine() {
    return this.start.line === this.end.line;
  }
  contains(positionOrRange) {
    return false;
  }
  isEqual(other) {
    return this.start.isEqual(other.start) && this.end.isEqual(other.end);
  }
  intersection(other) {
    return void 0;
  }
  union(other) {
    return new Range(this.start, this.end);
  }
  with(start, end) {
    return new Range(start ?? this.start, end ?? this.end);
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
}
class Location {
  constructor(uri, range) {
    this.uri = uri;
    this.range = range;
  }
  static {
    __name(this, "Location");
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
}
class TreeItem {
  static {
    __name(this, "TreeItem");
  }
  label;
  resourceUri;
  collapsibleState;
  constructor(labelOrUri, collapsibleState) {
    if (typeof labelOrUri === "string") {
      this.label = labelOrUri;
    } else {
      this.resourceUri = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}
class MarkdownString {
  constructor(value = "", isTrusted = false) {
    this.value = value;
    this.isTrusted = isTrusted;
  }
  static {
    __name(this, "MarkdownString");
  }
  // ... implement append* methods if needed
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
  ConfigurationTarget2[ConfigurationTarget2["Workspace"] = 2] = "Workspace";
  ConfigurationTarget2[ConfigurationTarget2["WorkspaceFolder"] = 3] = "WorkspaceFolder";
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
  Uri,
  ViewColumn
};
//# sourceMappingURL=ExtHostTypes.js.map
