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
};

const DefaultKey = "phc_mCwHy7LgvbnEqh6a2DyMiLUJcaZvmmj7JNmmpQzvr7mA";

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

export default (): Configuration => ({
	Key: ReadString("LAND_POSTHOG_KEY", DefaultKey),
	Host: ReadString("LAND_POSTHOG_HOST", DefaultHost),
	Enabled:
		ReadBoolean("LAND_POSTHOG_COCOON_ENABLED", true) &&
		process.env["NODE_ENV"] !== "production",
	BatchWindowMilliseconds: ReadNumber(
		"LAND_POSTHOG_COCOON_BATCH_WINDOW_MS",
		DefaultBatchWindowMilliseconds,
	),
	BatchMaximum: ReadNumber(
		"LAND_POSTHOG_COCOON_BATCH_MAX",
		DefaultBatchMaximum,
	),
	DistinctIdentifierSeed: process.env["LAND_POSTHOG_DISTINCT_ID"] ?? "",
});
