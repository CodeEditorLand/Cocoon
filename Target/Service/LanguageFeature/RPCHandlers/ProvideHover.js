var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter.js";
import { Cancellation } from "../../Cancellation/Service.js";
import { Document } from "../../Document/Service.js";
function ProvideHover(Registry, Handle, UriDTO, PosDTO, TokenID) {
  return Effect.gen(function* (_) {
    const DocumentService = yield* _(Document.Tag);
    const CancellationService = yield* _(Cancellation.Tag);
    const Entry = (yield* _(Ref.get(Registry))).get(Handle);
    if (!Entry) {
      return yield* _(
        Effect.fail(
          new Error(`Provider not found for handle ${Handle}`)
        )
      );
    }
    const revivedURI = TypeConverter.URIConverter.ToAPI(UriDTO);
    const document = yield* _(DocumentService.GetDocument(revivedURI));
    if (!document) {
      return yield* _(
        Effect.fail(
          new Error(
            `Document not found for hover: ${revivedURI.toString()}`
          )
        )
      );
    }
    const { Token } = yield* _(CancellationService.ObtainToken(TokenID));
    const revivedPosition = TypeConverter.PositionConverter.ToAPI(PosDTO);
    const provider = Entry.provider;
    const result = yield* _(
      Effect.tryPromise(
        () => provider.provideHover(document, revivedPosition, Token)
      )
    );
    if (!result) {
      return void 0;
    }
    const commandConverter = new TypeConverter.Command.Definition(
      {},
      () => void 0
    );
    return TypeConverter.Hover.fromAPI(result, commandConverter);
  }).pipe(
    Effect.scoped,
    // Ensures the cancellation token's scope is properly handled
    Effect.catchAll(() => Effect.succeed(void 0))
    // Return undefined on any failure
  );
}
__name(ProvideHover, "ProvideHover");
export {
  ProvideHover
};
//# sourceMappingURL=ProvideHover.js.map
