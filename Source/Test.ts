import { DevTools } from "@effect/experimental";
import { NodeRuntime, NodeSocket } from "@effect/platform-node";
import { Effect, Layer } from "effect";

const program = Effect.log("Hello!").pipe(
	Effect.delay(2000),
	Effect.withSpan("Hi", { attributes: { foo: "bar" } }),
	Effect.forever,
);
const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor),
);

program.pipe(Effect.provide(DevToolsLive), NodeRuntime.runMain);
