var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHog/Event.ts
var BaseProperties = {
  $app: "fiddee",
  $app_version: "0.0.1",
  $build_mode: "debug",
  $component: "cocoon",
  $tier: "cocoon",
  $lib: "cocoon-posthog-bridge"
};
var Create = /* @__PURE__ */ __name((Name, Properties = {}) => ({
  Name,
  Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  Properties
}), "Create");
var CurrentTraceIdentifier;
var SetTraceIdentifier = /* @__PURE__ */ __name((Identifier) => {
  CurrentTraceIdentifier = Identifier;
}, "SetTraceIdentifier");
var Enrich = /* @__PURE__ */ __name((Properties) => ({
  ...Properties,
  ...BaseProperties,
  $node_version: process.version,
  ...CurrentTraceIdentifier ? { $trace_id: CurrentTraceIdentifier } : {}
}), "Enrich");
var Event_default = { Create, Enrich, SetTraceIdentifier };

// Source/Telemetry/PostHog/Transport.ts
import * as NodeHttps from "node:https";
var RequestTimeoutMilliseconds = 5e3;
var Transport_default = /* @__PURE__ */ __name((Host, Key, DistinctIdentifier, Batch) => {
  if (Batch.length === 0) return;
  const Payload = JSON.stringify({
    api_key: Key,
    batch: Batch.map((Entry) => ({
      event: Entry.Name,
      timestamp: Entry.Timestamp,
      distinct_id: DistinctIdentifier,
      properties: Event_default.Enrich(Entry.Properties)
    }))
  });
  try {
    const Address = new URL("/batch/", Host);
    const Request = NodeHttps.request(
      {
        method: "POST",
        hostname: Address.hostname,
        port: Address.port || 443,
        path: Address.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(Payload)
        },
        timeout: RequestTimeoutMilliseconds
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
}, "default");

// Source/Telemetry/PostHog/Buffer.ts
var Buffer_default = /* @__PURE__ */ __name((Config, DistinctIdentifier) => {
  let Queue = [];
  let FlushTimer;
  const Send = /* @__PURE__ */ __name(() => {
    if (Queue.length === 0) return;
    const Pending = Queue;
    Queue = [];
    Transport_default(Config.Host, Config.Key, DistinctIdentifier, Pending);
  }, "Send");
  const ScheduleFlush = /* @__PURE__ */ __name(() => {
    if (FlushTimer) return;
    FlushTimer = setTimeout(() => {
      FlushTimer = void 0;
      Send();
    }, Config.BatchWindowMilliseconds);
    FlushTimer.unref?.();
  }, "ScheduleFlush");
  return {
    Enqueue: /* @__PURE__ */ __name((Name, Properties) => {
      Queue.push(Event_default.Create(Name, Properties));
      if (Queue.length >= Config.BatchMaximum) {
        Send();
        return;
      }
      ScheduleFlush();
    }, "Enqueue"),
    Drain: /* @__PURE__ */ __name(() => {
      if (FlushTimer) {
        clearTimeout(FlushTimer);
        FlushTimer = void 0;
      }
      Send();
    }, "Drain")
  };
}, "default");
export {
  Buffer_default as default
};
//# sourceMappingURL=Buffer.js.map
