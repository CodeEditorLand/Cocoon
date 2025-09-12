var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { CancellationTokenSource as VSCodeCancellationTokenSource } from "@codeeditorland/output/vs/base/common/cancellation.js";
import { CancellationError as VSCodeCancellationError } from "@codeeditorland/output/vs/base/common/errors.js";
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import { URI as VSCodeURI } from "@codeeditorland/output/vs/base/common/uri.js";
import { FileType as VSCodeFileType } from "@codeeditorland/output/vs/platform/files/common/files.js";
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
  TreeItemCollapsibleState,
  ViewColumn,
  ProcessExecution as VSCodeProcessExecution,
  Task as VSCodeTask,
  TextEdit as VSCodeTextEdit,
  ThemeIcon as VSCodeThemeIcon,
  WorkspaceEdit as VSCodeWorkspaceEdit
} from "vscode";
class Disposable {
  static {
    __name(this, "Disposable");
  }
  _callOnDispose;
  constructor(callOnDispose) {
    this._callOnDispose = callOnDispose;
  }
  dispose() {
    this._callOnDispose();
  }
  [Symbol.dispose]() {
    this.dispose();
  }
}
const CancellationTokenSource = VSCodeCancellationTokenSource;
const CancellationError = VSCodeCancellationError;
const EventEmitter = Emitter;
const URI = VSCodeURI;
const ThemeIcon = VSCodeThemeIcon;
const ProcessExecution = VSCodeProcessExecution;
const Task = VSCodeTask;
const WorkspaceEdit = VSCodeWorkspaceEdit;
const TextEdit = VSCodeTextEdit;
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
    if (this.line < other.line) return -1;
    if (this.line > other.line) return 1;
    if (this.character < other.character) return -1;
    if (this.character > other.character) return 1;
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
  constructor(anchor, active, activeLine, activeCharacter) {
    let anchorPos;
    let activePos;
    if (typeof anchor === "number" && typeof active === "number" && typeof activeLine === "number" && typeof activeCharacter === "number") {
      anchorPos = new Position(anchor, active);
      activePos = new Position(activeLine, activeCharacter);
    } else if (anchor instanceof Position && active instanceof Position) {
      anchorPos = anchor;
      activePos = active;
    } else {
      throw new Error("Invalid arguments");
    }
    super(anchorPos, activePos);
    this.anchor = anchorPos;
    this.active = activePos;
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
class TreeItem {
  static {
    __name(this, "TreeItem");
  }
  label;
  resourceUri;
  collapsibleState;
  id;
  description;
  command;
  constructor(labelOrUri, collapsibleState = TreeItemCollapsibleState.None) {
    if (typeof labelOrUri === "string" || isTreeItemLabel(labelOrUri)) {
      this.label = labelOrUri;
    } else {
      this.resourceUri = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}
function isTreeItemLabel(thing) {
  return thing && typeof thing === "object" && typeof thing.label === "string";
}
__name(isTreeItemLabel, "isTreeItemLabel");
const FileType = VSCodeFileType;
export {
  CancellationError,
  CancellationTokenSource,
  CompletionItemKind,
  CompletionItemTag,
  ConfigurationTarget,
  DiagnosticSeverity,
  DiagnosticTag,
  Disposable,
  EndOfLine,
  EventEmitter,
  FileType,
  MarkdownString,
  Position,
  ProcessExecution,
  ProgressLocation,
  QuickPickItemKind,
  Range,
  Selection,
  SnippetString,
  StatusBarAlignment,
  Task,
  TextEdit,
  TextEditorCursorStyle,
  ThemeColor,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  URI,
  ViewColumn,
  WorkspaceEdit
};
//# sourceMappingURL=Type.js.map
