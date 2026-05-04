var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHog/Configuration.ts
var DefaultKey = "";
var DefaultHost = "https://eu.i.posthog.com";
var DefaultBatchWindowMilliseconds = 3e3;
var DefaultBatchMaximum = 50;
var ReadString = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  return Value && Value.length > 0 ? Value : Fallback;
}, "ReadString");
var ReadBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  if (Value === void 0) return Fallback;
  return !["false", "0", "off", ""].includes(Value.toLowerCase());
}, "ReadBoolean");
var ReadNumber = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  const Parsed = Value ? Number(Value) : Number.NaN;
  return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
}, "ReadNumber");
var TelemetryCaptureEnabled = ReadBoolean("Capture", true);
var Configuration_default = /* @__PURE__ */ __name(() => ({
  Key: ReadString("Authorize", DefaultKey),
  Host: ReadString("Beam", DefaultHost),
  Enabled: ReadBoolean("Report", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production",
  BatchWindowMilliseconds: ReadNumber(
    "Buffer",
    DefaultBatchWindowMilliseconds
  ),
  BatchMaximum: ReadNumber("Batch", DefaultBatchMaximum),
  DistinctIdentifierSeed: process.env["Brand"] ?? "",
  OTLPEndpoint: ReadString("OTLPEndpoint", "http://127.0.0.1:4318"),
  OTLPEnabled: ReadBoolean("OTLPEnabled", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production"
}), "default");

// Source/Telemetry/OTLPBridge.ts
import * as NodeHttp from "node:http";
import * as NodeHttps from "node:https";
var Configuration = Configuration_default();
var OTLPAvailable = Configuration.OTLPEnabled;
var RandomHex = /* @__PURE__ */ __name((Bytes) => {
  let Output = "";
  for (let Index = 0; Index < Bytes; Index = Index + 1) {
    Output = Output + Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return Output;
}, "RandomHex");
var TraceIdentifierCached;
var TraceIdentifier = /* @__PURE__ */ __name(() => {
  if (!TraceIdentifierCached) TraceIdentifierCached = RandomHex(16);
  return TraceIdentifierCached;
}, "TraceIdentifier");
var NowNano = /* @__PURE__ */ __name(() => {
  const Hr = process.hrtime();
  return BigInt(Hr[0]) * 1000000000n + BigInt(Hr[1]);
}, "NowNano");
var CaptureSpan = /* @__PURE__ */ __name((Name, StartNano, EndNano, Attributes = []) => {
  if (process.env["NODE_ENV"] === "production") return;
  if (!OTLPAvailable) return;
  const SpanIdentifier = RandomHex(8);
  const TraceIdentifierResolved = TraceIdentifier();
  const StatusCode = Name.includes("error") ? 2 : 1;
  const AttributesPayload = Attributes.map(([Key, Value]) => ({
    key: Key,
    value: { stringValue: Value }
  }));
  const Payload = JSON.stringify({
    resourceSpans: [
      {
        resource: {
          attributes: [
            {
              key: "service.name",
              value: { stringValue: "land-editor-cocoon" }
            },
            {
              key: "service.version",
              value: { stringValue: "0.0.1" }
            },
            {
              key: "land.tier",
              value: { stringValue: "cocoon" }
            }
          ]
        },
        scopeSpans: [
          {
            scope: { name: "land.cocoon", version: "1.0.0" },
            spans: [
              {
                traceId: TraceIdentifierResolved,
                spanId: SpanIdentifier,
                name: Name,
                kind: 1,
                startTimeUnixNano: StartNano.toString(),
                endTimeUnixNano: EndNano.toString(),
                attributes: AttributesPayload,
                status: { code: StatusCode }
              }
            ]
          }
        ]
      }
    ]
  });
  try {
    const Address = new URL("/v1/traces", Configuration.OTLPEndpoint);
    const HttpModule = Address.protocol === "https:" ? NodeHttps : NodeHttp;
    const Request = HttpModule.request(
      {
        method: "POST",
        hostname: Address.hostname,
        port: Address.port || (Address.protocol === "https:" ? 443 : 80),
        path: Address.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(Payload)
        },
        timeout: 200
      },
      (Response) => {
        if (Response.statusCode === void 0 || Response.statusCode >= 300) {
          OTLPAvailable = false;
        }
        Response.resume();
      }
    );
    Request.on("error", () => {
      OTLPAvailable = false;
    });
    Request.on("timeout", () => {
      Request.destroy();
    });
    Request.write(Payload);
    Request.end();
  } catch {
    OTLPAvailable = false;
  }
}, "CaptureSpan");
var WithSpan = /* @__PURE__ */ __name(async (Name, Body, Attributes = []) => {
  const StartNano = NowNano();
  try {
    const Output = await Body();
    const EndNano = NowNano();
    CaptureSpan(Name, StartNano, EndNano, Attributes);
    return Output;
  } catch (Error2) {
    const EndNano = NowNano();
    CaptureSpan(`${Name}:error`, StartNano, EndNano, [
      ...Attributes,
      ["error", String(Error2.message ?? Error2)]
    ]);
    throw Error2;
  }
}, "WithSpan");
var OTLPBridge_default = { CaptureSpan, TraceIdentifier, WithSpan };
export {
  CaptureSpan,
  TraceIdentifier,
  WithSpan,
  OTLPBridge_default as default
};
//# sourceMappingURL=OTLPBridge.js.map
