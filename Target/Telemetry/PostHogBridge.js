var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHogBridge.ts
import * as NodeHttps from "node:https";
var ReadEnvString = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  return Value && Value.length > 0 ? Value : Fallback;
}, "ReadEnvString");
var ReadEnvBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  if (Value === void 0) return Fallback;
  return !["false", "0", "off", ""].includes(Value.toLowerCase());
}, "ReadEnvBoolean");
var ReadEnvNumber = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  const Parsed = Value ? Number(Value) : NaN;
  return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
}, "ReadEnvNumber");
var PostHogKey = ReadEnvString(
  "LAND_POSTHOG_KEY",
  "phc_mCwHy7LgvbnEqh6a2DyMiLUJcaZvmmj7JNmmpQzvr7mA"
);
var PostHogHost = ReadEnvString(
  "LAND_POSTHOG_HOST",
  "https://eu.i.posthog.com"
);
var PostHogEnabled = ReadEnvBoolean("LAND_POSTHOG_COCOON_ENABLED", true);
var BatchWindowMs = ReadEnvNumber(
  "LAND_POSTHOG_COCOON_BATCH_WINDOW_MS",
  3e3
);
var BatchMax = ReadEnvNumber("LAND_POSTHOG_COCOON_BATCH_MAX", 50);
var DistinctIdSeed = process.env["LAND_POSTHOG_DISTINCT_ID"] ?? "";
var Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
var DistinctId = DistinctIdSeed.length > 0 ? DistinctIdSeed : `land-dev-${Username}`;
var Queue = [];
var FlushTimer;
var Initialized = false;
var CaptureAllowed = /* @__PURE__ */ __name(() => {
  if (!PostHogEnabled) return false;
  if (process.env["NODE_ENV"] === "production") return false;
  return true;
}, "CaptureAllowed");
var Flush = /* @__PURE__ */ __name(() => {
  if (Queue.length === 0) return;
  const Pending = Queue;
  Queue = [];
  const Payload = JSON.stringify({
    api_key: PostHogKey,
    batch: Pending.map((E) => ({
      event: E.event,
      timestamp: E.timestamp,
      distinct_id: DistinctId,
      properties: {
        ...E.properties,
        $app: "land-editor",
        $app_version: "0.0.1",
        $build_mode: "debug",
        $component: "cocoon",
        $tier: "cocoon",
        $lib: "cocoon-posthog-bridge",
        $node_version: process.version
      }
    }))
  });
  try {
    const Url = new URL("/batch/", PostHogHost);
    const Request = NodeHttps.request(
      {
        method: "POST",
        hostname: Url.hostname,
        port: Url.port || 443,
        path: Url.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(Payload)
        },
        timeout: 5e3
      },
      (Response) => {
        Response.resume();
      }
    );
    Request.on("error", () => {
    });
    Request.on("timeout", () => {
      Request.destroy();
    });
    Request.write(Payload);
    Request.end();
  } catch {
  }
}, "Flush");
var ScheduleFlush = /* @__PURE__ */ __name(() => {
  if (FlushTimer) return;
  FlushTimer = setTimeout(() => {
    FlushTimer = void 0;
    Flush();
  }, BatchWindowMs);
  FlushTimer.unref?.();
}, "ScheduleFlush");
var CaptureEvent = /* @__PURE__ */ __name((Event, Properties = {}) => {
  if (!CaptureAllowed()) return;
  try {
    Queue.push({
      event: Event,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      properties: Properties
    });
    if (Queue.length >= BatchMax) {
      Flush();
    } else {
      ScheduleFlush();
    }
  } catch {
  }
}, "CaptureEvent");
var CaptureError = /* @__PURE__ */ __name((Tag, Message, Extra = {}) => {
  if (!CaptureAllowed()) return;
  Queue.push({
    event: "cocoon:error",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    properties: {
      ...Extra,
      error_tag: Tag,
      error_message: Message
    }
  });
  Flush();
}, "CaptureError");
var Initialize = /* @__PURE__ */ __name(() => {
  if (Initialized) return;
  Initialized = true;
  if (!CaptureAllowed()) return;
  const FlushOnExit = /* @__PURE__ */ __name(() => {
    try {
      Flush();
    } catch {
    }
  }, "FlushOnExit");
  process.once("exit", FlushOnExit);
  process.once("SIGINT", FlushOnExit);
  process.once("SIGTERM", FlushOnExit);
  CaptureEvent("cocoon:session:start", {
    pid: process.pid,
    platform: process.platform,
    arch: process.arch
  });
}, "Initialize");
var PostHogBridge_default = {
  CaptureEvent,
  CaptureError,
  Initialize
};
export {
  CaptureError,
  CaptureEvent,
  Initialize,
  PostHogBridge_default as default
};
//# sourceMappingURL=PostHogBridge.js.map
