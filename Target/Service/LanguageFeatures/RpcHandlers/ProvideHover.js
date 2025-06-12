var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter/mod.js";
import { Tag as CancellationTokenTag } from "../../Cancellation/Service.js";
import { Tag as DocumentsTag } from "../../Documents/Service.js";
const ProvideHover = /* @__PURE__ */ __name((Registry, Handle, UriDto, PosDto, TokenDto) => Effect.gen(function* (_) {
  const Documents = yield* _(DocumentsTag);
  const Cancellation = yield* _(CancellationTokenTag);
  const Entry = (yield* _(Registry)).get(Handle);
  if (!Entry || Entry.type !== "Hover")
    throw new Error(
      `Provider not found or wrong type for handle ${Handle}`
    );
  const Uri = TypeConverter.Uri.toApi(UriDto);
  const Document = yield* _(Documents.GetDocument(Uri));
  if (!Document)
    throw new Error(`Document not found for hover: ${Uri.toString()}`);
  const TokenData = yield* _(Cancellation.ObtainToken(TokenDto.id));
  const Position = TypeConverter.Position.toApi(PosDto);
  const Provider = Entry.provider;
  const Result = yield* _(
    Effect.tryPromise(
      () => Provider.provideHover(Document, Position, TokenData.Token)
    )
  );
  const CommandsConverter = {};
  return TypeConverter.Hover.fromApi(Result, CommandsConverter);
}).pipe(
  Effect.scoped,
  // Ensures the cancellation token's scope is properly handled
  Effect.catchAll(() => Effect.succeed(void 0))
  // Return undefined on any failure
), "ProvideHover");
export {
  ProvideHover
};
//# sourceMappingURL=ProvideHover.js.map
