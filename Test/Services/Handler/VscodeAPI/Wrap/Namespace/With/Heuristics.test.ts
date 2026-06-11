/**
 * @module Handler/VscodeAPI/WrapNamespaceWithHeuristics Tests
 * @description
 * Contract tests for the Proxy heuristic fallback that backs every
 * `vscode.<namespace>` shim. Locks in the `Reflect.has` guard: a
 * property the concrete namespace defines - even one whose getter
 * returns `undefined`, like `window.activeTextEditor` with no active
 * editor - must be returned faithfully, never replaced by a heuristic
 * function. Also pins the heuristic shapes for absent properties
 * (`onDid*` / `register*` disposables, `is*` awaitable `false`,
 * default awaitable `undefined`) and the thenable guard on `then`.
 */

import { describe, expect, it } from "vitest";

import WrapNamespaceWithHeuristics from "../../../../../../../Source/Services/Handler/VscodeAPI/Wrap/Namespace/With/Heuristics";

const Wrap = (Namespace: object): Record<string, unknown> =>
	WrapNamespaceWithHeuristics("workspace", Namespace) as Record<
		string,
		unknown
	>;

describe("WrapNamespaceWithHeuristics", () => {
	it("returns undefined for a defined getter whose value is undefined", () => {
		const Wrapped = Wrap({
			get activeTextEditor() {
				return undefined;
			},
		});

		expect(Wrapped["activeTextEditor"]).toBeUndefined();

		expect(typeof Wrapped["activeTextEditor"]).not.toBe("function");
	});

	it("returns a disposable-returning function for an absent onDid* property", () => {
		const Wrapped = Wrap({});

		const Subscribe = Wrapped["onDidChangeNothing"];

		expect(typeof Subscribe).toBe("function");

		const Disposable = (Subscribe as (...Arguments: unknown[]) => unknown)(
			() => {},
		) as { dispose: () => void };

		expect(typeof Disposable.dispose).toBe("function");

		expect(() => Disposable.dispose()).not.toThrow();
	});

	it("returns a disposable for an absent register* property", () => {
		const Wrapped = Wrap({});

		const Register = Wrapped["registerNothingProvider"] as (
			...Arguments: unknown[]
		) => { dispose: () => void };

		expect(typeof Register).toBe("function");

		const Disposable = Register("selector", {});

		expect(typeof Disposable.dispose).toBe("function");
	});

	it("resolves to false for an absent is* predicate", async () => {
		const Wrapped = Wrap({});

		const Predicate = Wrapped["isNothingEnabled"] as (
			...Arguments: unknown[]
		) => unknown;

		expect(typeof Predicate).toBe("function");

		await expect(Promise.resolve(Predicate("argument"))).resolves.toBe(
			false,
		);
	});

	it("resolves to undefined for an absent default-shaped property", async () => {
		const Wrapped = Wrap({});

		const Unknown = Wrapped["applyNothing"] as (
			...Arguments: unknown[]
		) => unknown;

		expect(typeof Unknown).toBe("function");

		await expect(Promise.resolve(Unknown())).resolves.toBeUndefined();
	});

	it("returns undefined for then access so the proxy is not thenable", () => {
		const Wrapped = Wrap({});

		expect(Wrapped["then"]).toBeUndefined();
	});
});
