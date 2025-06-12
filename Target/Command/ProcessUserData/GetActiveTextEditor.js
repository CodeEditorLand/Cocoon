import { Effect, Option } from "effect";
import * as Vscode from "vscode";
const GetActiveTextEditor = Effect.sync(
  () => Option.fromNullable(Vscode.window.activeTextEditor)
);
export {
  GetActiveTextEditor
};
//# sourceMappingURL=GetActiveTextEditor.js.map
