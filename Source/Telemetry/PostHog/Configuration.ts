/**
 * @module Telemetry/PostHog/Configuration
 * @description
 * Resolves PostHog configuration from the process environment. Single
 * source of truth for every capture path in Cocoon so a single `.env.Land.PostHog`
 * edit propagates to every call site.
 */

export type Configuration = {

	readonly Key: string;

	readonly Host: string;

	readonly Enabled: boolean;

	readonly BatchWindowMilliseconds: number;

	readonly BatchMaximum: number;

	readonly DistinctIdentifierSeed: string;

	readonly Pipe: string;

	readonly Emit: boolean;
};

const DefaultKey = "";

const DefaultHost = "https://eu.i.posthog.com";

const DefaultBatchWindowMilliseconds = 3000;

const DefaultBatchMaximum = 50;

const ReadString = (Key: string, Fallback: string): string => {

	const Value = process.env[Key];

	return Value && Value.length > 0 ? Value : Fallback;
};

const ReadBoolean = (Key: string, Fallback: boolean): boolean => {

	const Value = process.env[Key];

	if (Value === undefined) return Fallback;

	return !["false", "0", "off", ""].includes(Value.toLowerCase());
};

const ReadNumber = (Key: string, Fallback: number): number => {
	const Value = process.env[Key];

	const Parsed = Value ? Number(Value) : Number.NaN;

	return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
};

// `Capture=false` is the master telemetry kill switch shared with
// Mountain / Sky / Build.sh. Honored regardless of `Report` /
// `Emit` so a single env flip stops both pipes when running an
// airgapped session. Distinct from `.env.Land.Diagnostics`'s `Disable`
// which kills polyfills/shims (not telemetry).
const TelemetryCaptureEnabled = ReadBoolean("Capture", true);

export default (): Configuration => ({
	Key: ReadString("Authorize", DefaultKey),
	Host: ReadString("Beam", DefaultHost),
	Enabled:
		ReadBoolean("Report", true) &&
		TelemetryCaptureEnabled &&
		process.env["NODE_ENV"] !== "production",
	BatchWindowMilliseconds: ReadNumber(
		"Buffer",

		DefaultBatchWindowMilliseconds,
	),
	BatchMaximum: ReadNumber("Batch", DefaultBatchMaximum),
	DistinctIdentifierSeed: process.env["Brand"] ?? "",
	Pipe: ReadString("Pipe", "http://127.0.0.1:4318"),
	Emit:
		ReadBoolean("Emit", true) &&
		TelemetryCaptureEnabled &&
		process.env["NODE_ENV"] !== "production",
});
