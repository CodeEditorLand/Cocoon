var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import { CancellationError as VscCancellationError } from "vs/base/common/errors.js";
import { Emitter } from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI as VscURI } from "vs/base/common/uri.js";
import { FileType as VscFileType } from "vs/platform/files/common/files.js";
import {
  CompletionItemKind,
  CompletionItemTag,
  ConfigurationTarget,
  DiagnosticSeverity,
  DiagnosticTag,
  EndOfLine,
  ProgressLocation,
  QuickPickItemKind,
  SnippetString,
  StatusBarAlignment,
  TextEditorCursorStyle,
  ViewColumn
} from "vscode";
const Disposable = Lifecycle.Disposable;
const CancellationTokenSource = VscCancellationTokenSource;
const CancellationError = VscCancellationError;
const EventEmitter = Emitter;
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
  translate(lineDeltaOrChange, characterDelta = 0) {
    if (lineDeltaOrChange === null || lineDeltaOrChange === void 0) {
      return this;
    }
    if (typeof lineDeltaOrChange === "number") {
      return new Position(
        this.line + lineDeltaOrChange,
        this.character + characterDelta
      );
    }
    return new Position(
      this.line + (lineDeltaOrChange.lineDelta ?? 0),
      this.character + (lineDeltaOrChange.characterDelta ?? 0)
    );
  }
  with(lineOrChange, character = this.character) {
    if (lineOrChange === null || lineOrChange === void 0) {
      return this;
    }
    if (typeof lineOrChange === "number") {
      return new Position(lineOrChange, character);
    }
    return new Position(
      lineOrChange.line ?? this.line,
      lineOrChange.character ?? this.character
    );
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
  constructor(startLineOrPosition, startCharacterOrPosition, endLine, endCharacter) {
    let start;
    let end;
    if (typeof startLineOrPosition === "number" && typeof startCharacterOrPosition === "number" && typeof endLine === "number" && typeof endCharacter === "number") {
      start = new Position(startLineOrPosition, startCharacterOrPosition);
      end = new Position(endLine, endCharacter);
    } else if (startLineOrPosition instanceof Position && startCharacterOrPosition instanceof Position) {
      start = startLineOrPosition;
      end = startCharacterOrPosition;
    } else {
      throw new Error("Invalid arguments");
    }
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
  with(startOrChange, end = this.end) {
    if (startOrChange === null || startOrChange === void 0) {
      return this;
    }
    if (startOrChange instanceof Position) {
      return new Range(startOrChange, end);
    }
    return new Range(
      startOrChange.start ?? this.start,
      startOrChange.end ?? this.end
    );
  }
  toJSON() {
    return [this.start.toJSON(), this.end.toJSON()];
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
      start: this.start.toJSON(),
      end: this.end.toJSON(),
      active: this.active.toJSON(),
      anchor: this.anchor.toJSON()
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
      range: this.range.toJSON()
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
  constructor(range, message, severity = DiagnosticSeverity.Error) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
  toJSON() {
    return {
      message: this.message,
      severity: DiagnosticSeverity[this.severity],
      range: this.range.toJSON()
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
function isTreeItemLabel(thing) {
  return thing && typeof thing === "object" && typeof thing.label === "string";
}
__name(isTreeItemLabel, "isTreeItemLabel");
class TreeItem {
  static {
    __name(this, "TreeItem");
  }
  label;
  resourceURI;
  collapsibleState;
  id;
  description;
  command;
  constructor(labelOrUri, collapsibleState) {
    if (typeof labelOrUri === "string" || isTreeItemLabel(labelOrUri)) {
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
  supportThemeIcons;
  supportHtml;
  baseUri;
  constructor(value = "", isTrusted = false) {
    this.value = value;
    this.isTrusted = isTrusted;
  }
  appendText(value) {
    this.value += value;
    return this;
  }
  appendMarkdown(value) {
    this.value += value;
    return this;
  }
  appendCodeblock(value, language = "") {
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
class TextEdit {
  constructor(range, newText) {
    this.range = range;
    this.newText = newText;
  }
  static {
    __name(this, "TextEdit");
  }
  static replace(range, newText) {
    return new TextEdit(range, newText);
  }
  static insert(position, newText) {
    return TextEdit.replace(new Range(position, position), newText);
  }
  static delete(range) {
    return TextEdit.replace(range, "");
  }
  static setEndOfLine(eol) {
    const r = new TextEdit(
      new Range(new Position(0, 0), new Position(0, 0)),
      ""
    );
    r.newEol = eol;
    return r;
  }
  newEol;
}
class CompletionItem {
  static {
    __name(this, "CompletionItem");
  }
  label;
  kind;
  tags;
  detail;
  documentation;
  sortText;
  filterText;
  preselect;
  insertText;
  range;
  commitCharacters;
  additionalTextEdits;
  command;
  constructor(label, kind) {
    this.label = label;
    this.kind = kind;
  }
}
class ProcessExecution {
  static {
    __name(this, "ProcessExecution");
  }
  process;
  args;
  options;
  constructor(process, args, options) {
    this.process = process;
    this.args = args;
    this.options = options;
  }
}
class ShellExecution {
  static {
    __name(this, "ShellExecution");
  }
  commandLine;
  options;
  constructor(commandLine, options) {
    this.commandLine = commandLine;
    this.options = options;
  }
  command;
  args;
}
class Task {
  static {
    __name(this, "Task");
  }
  definition;
  scope;
  name;
  source;
  execution;
  problemMatchers;
  isBackground;
  presentationOptions;
  group;
  runOptions;
  constructor(definition, scope, name, source, execution, problemMatchers) {
    this.definition = definition;
    this.scope = scope;
    this.name = name;
    this.source = source;
    this.execution = execution;
    this.problemMatchers = problemMatchers ?? [];
    this.isBackground = false;
    this.presentationOptions = {};
    this.runOptions = {};
  }
}
class WorkspaceEdit {
  static {
    __name(this, "WorkspaceEdit");
  }
  _edits = /* @__PURE__ */ new Map();
  set(uri, edits) {
    this._edits.set(uri.toString(), edits ? [...edits] : []);
  }
  entries() {
    return Array.from(this._edits.entries()).map(([uri, edits]) => [
      URI.parse(uri),
      edits
    ]);
  }
  get(uri) {
    return this._edits.get(uri.toString()) ?? [];
  }
  has(uri) {
    return this._edits.has(uri.toString());
  }
  get size() {
    return this._edits.size;
  }
  renameFile(_oldUri, _newUri, _options) {
  }
  createFile(_uri, _options) {
  }
  deleteFile(_uri, _options) {
  }
  replace(_uri, _range, _newText) {
  }
  insert(_uri, _position, _newText) {
  }
  delete(_uri, _range) {
  }
}
const FileType = VscFileType;
export {
  CancellationError,
  CancellationTokenSource,
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  ConfigurationTarget,
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  DiagnosticTag,
  Disposable,
  EndOfLine,
  EventEmitter,
  FileType,
  Location,
  MarkdownString,
  Position,
  ProcessExecution,
  ProgressLocation,
  QuickPickItemKind,
  Range,
  Selection,
  ShellExecution,
  SnippetString,
  StatusBarAlignment,
  Task,
  TextEdit,
  TextEditorCursorStyle,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  URI,
  ViewColumn,
  WorkspaceEdit
};
//# sourceMappingURL=ExtHostTypes.js.map
