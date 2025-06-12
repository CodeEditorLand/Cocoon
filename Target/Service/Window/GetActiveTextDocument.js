import { Effect, Option } from "effect";
import * as Vscode from "vscode";
const GetActiveTextDocument = Effect.sync(
  () => Option.fromNullable(Vscode.window.activeTextEditor?.document)
);
export {
  GetActiveTextDocument
};
//# sourceMappingURL=GetActiveTextDocument.js.map
