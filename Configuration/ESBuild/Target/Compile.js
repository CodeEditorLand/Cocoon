import $ from "node:crypto";

var be = Object.defineProperty;
var f = (e, t) => () => (e && (t = e((e = 0))), t);
var l = (e, t) => {
	for (var n in t) be(e, n, { get: t[n], enumerable: !0 });
};
var y = {};
l(y, {
	Bundle: () => L,
	Clean: () => W,
	Compile: () => Ee,
	On: () => m,
	default: () => Oe,
	posix: () => xe,
	sep: () => Ae,
});
var m,
	W,
	L,
	Ee,
	Oe,
	Ae,
	xe,
	h = f(async () => {
		"use strict";
		((m =
			process.env.NODE_ENV === "development" ||
			process.env.TAURI_ENV_DEBUG === "true"),
			(W = process.env.Clean === "true"),
			(L = process.env.Bundle === "true"),
			(Ee = process.env.Compile === "true"),
			(Oe = {
				color: !0,
				format: "esm",
				logLevel: "debug",
				metafile: !0,
				minify: !m,
				outdir: "Configuration",
				platform: "node",
				target: "esnext",
				tsconfig: "tsconfig.json",
				write: !0,
				legalComments: m ? "inline" : "none",
				bundle: L,
				assetNames: "Asset/[name]-[hash]",
				sourcemap: m,
				drop: m ? [] : ["debugger"],
				ignoreAnnotations: !m,
				keepNames: m,
				plugins: [
					{
						name: "Target",
						setup({ onStart: e, initialOptions: { outdir: t } }) {
							!0 === (W === !0) &&
								e(async () => {
									try {
										t &&
											(await (
												await import("node:fs/promises")
											).rm(t, { recursive: !0 }));
									} catch (n) {
										console.log(n);
									}
								});
						},
					},
				],
				outbase: "Source/Configuration",
				loader: { ".json": "copy", ".sh": "copy" },
			}),
			({ sep: Ae, posix: xe } = await import("node:path")));
	});
var B = {};
l(B, {
	deepmerge: () => Se,
	deepmergeCustom: () => J,
	deepmergeInto: () => Ge,
	deepmergeIntoCustom: () => Q,
	getKeys: () => _,
	getObjectType: () => A,
	objectHasProperty: () => V,
});
function z(e, t) {
	return t;
}
function K(e, t) {
	return e.filter((n) => n !== void 0);
}
function A(e) {
	return typeof e != "object" || e === null
		? 0
		: Array.isArray(e)
			? 2
			: De(e)
				? 1
				: e instanceof Set
					? 3
					: e instanceof Map
						? 4
						: 5;
}
function _(e) {
	let t = new Set();
	for (let n of e)
		for (let r of [...Object.keys(n), ...Object.getOwnPropertySymbols(n)])
			t.add(r);
	return t;
}
function V(e, t) {
	return (
		typeof e == "object" && Object.prototype.propertyIsEnumerable.call(e, t)
	);
}
function R(e) {
	let t = 0,
		n = e[0]?.[Symbol.iterator]();
	return {
		[Symbol.iterator]() {
			return {
				next() {
					do {
						if (n === void 0) return { done: !0, value: void 0 };
						let r = n.next();
						if (r.done === !0) {
							((t += 1), (n = e[t]?.[Symbol.iterator]()));
							continue;
						}
						return { done: !1, value: r.value };
					} while (!0);
				},
			};
		},
	};
}
function De(e) {
	if (!X.includes(Object.prototype.toString.call(e))) return !1;
	let { constructor: t } = e;
	if (t === void 0) return !0;
	let n = t.prototype;
	return !(
		n === null ||
		typeof n != "object" ||
		!X.includes(Object.prototype.toString.call(n)) ||
		!n.hasOwnProperty("isPrototypeOf")
	);
}
function ve(e, t, n) {
	let r = {};
	for (let o of _(e)) {
		let i = [];
		for (let g of e) V(g, o) && i.push(g[o]);
		if (i.length === 0) continue;
		let s = t.metaDataUpdater(n, { key: o, parents: e }),
			u = Y(i, t, s);
		u !== d.skip &&
			(o === "__proto__"
				? Object.defineProperty(r, o, {
						value: u,
						configurable: !0,
						enumerable: !0,
						writable: !0,
					})
				: (r[o] = u));
	}
	return r;
}
function Re(e) {
	return e.flat();
}
function $e(e) {
	return new Set(R(e));
}
function Ne(e) {
	return new Map(R(e));
}
function Fe(e) {
	return e.at(-1);
}
function Se(...e) {
	return J({})(...e);
}
function J(e, t) {
	let n = Te(e, r);
	function r(...o) {
		return Y(o, n, t);
	}
	return r;
}
function Te(e, t) {
	return {
		defaultMergeFunctions: D,
		mergeFunctions: {
			...D,
			...Object.fromEntries(
				Object.entries(e)
					.filter(([n, r]) => Object.hasOwn(D, n))
					.map(([n, r]) => (r === !1 ? [n, D.mergeOthers] : [n, r])),
			),
		},
		metaDataUpdater: e.metaDataUpdater ?? z,
		deepmerge: t,
		useImplicitDefaultMerging: e.enableImplicitDefaultMerging ?? !1,
		filterValues: e.filterValues === !1 ? void 0 : (e.filterValues ?? K),
		actions: d,
	};
}
function Y(e, t, n) {
	let r = t.filterValues?.(e, n) ?? e;
	if (r.length === 0) return;
	if (r.length === 1) return C(r, t, n);
	let o = A(r[0]);
	if (o !== 0 && o !== 5) {
		for (let i = 1; i < r.length; i++) if (A(r[i]) !== o) return C(r, t, n);
	}
	switch (o) {
		case 1:
			return Ce(r, t, n);
		case 2:
			return Ue(r, t, n);
		case 3:
			return _e(r, t, n);
		case 4:
			return Ve(r, t, n);
		default:
			return C(r, t, n);
	}
}
function Ce(e, t, n) {
	let r = t.mergeFunctions.mergeRecords(e, t, n);
	return r === d.defaultMerge ||
		(t.useImplicitDefaultMerging &&
			r === void 0 &&
			t.mergeFunctions.mergeRecords !==
				t.defaultMergeFunctions.mergeRecords)
		? t.defaultMergeFunctions.mergeRecords(e, t, n)
		: r;
}
function Ue(e, t, n) {
	let r = t.mergeFunctions.mergeArrays(e, t, n);
	return r === d.defaultMerge ||
		(t.useImplicitDefaultMerging &&
			r === void 0 &&
			t.mergeFunctions.mergeArrays !==
				t.defaultMergeFunctions.mergeArrays)
		? t.defaultMergeFunctions.mergeArrays(e)
		: r;
}
function _e(e, t, n) {
	let r = t.mergeFunctions.mergeSets(e, t, n);
	return r === d.defaultMerge ||
		(t.useImplicitDefaultMerging &&
			r === void 0 &&
			t.mergeFunctions.mergeSets !== t.defaultMergeFunctions.mergeSets)
		? t.defaultMergeFunctions.mergeSets(e)
		: r;
}
function Ve(e, t, n) {
	let r = t.mergeFunctions.mergeMaps(e, t, n);
	return r === d.defaultMerge ||
		(t.useImplicitDefaultMerging &&
			r === void 0 &&
			t.mergeFunctions.mergeMaps !== t.defaultMergeFunctions.mergeMaps)
		? t.defaultMergeFunctions.mergeMaps(e)
		: r;
}
function C(e, t, n) {
	let r = t.mergeFunctions.mergeOthers(e, t, n);
	return r === d.defaultMerge ||
		(t.useImplicitDefaultMerging &&
			r === void 0 &&
			t.mergeFunctions.mergeOthers !==
				t.defaultMergeFunctions.mergeOthers)
		? t.defaultMergeFunctions.mergeOthers(e)
		: r;
}
function Be(e, t, n, r) {
	for (let o of _(t)) {
		let i = [];
		for (let g of t) V(g, o) && i.push(g[o]);
		if (i.length === 0) continue;
		let s = n.metaDataUpdater(r, { key: o, parents: t }),
			u = { value: i[0] };
		(q(u, i, n, s),
			o === "__proto__"
				? Object.defineProperty(e.value, o, {
						value: u.value,
						configurable: !0,
						enumerable: !0,
						writable: !0,
					})
				: (e.value[o] = u.value));
	}
}
function Pe(e, t) {
	e.value.push(...t.slice(1).flat());
}
function Ze(e, t) {
	for (let n of R(t.slice(1))) e.value.add(n);
}
function je(e, t) {
	for (let [n, r] of R(t.slice(1))) e.value.set(n, r);
}
function ke(e, t) {
	e.value = t.at(-1);
}
function Ge(e, ...t) {
	Q({})(e, ...t);
}
function Q(e, t) {
	let n = We(e, r);
	function r(o, ...i) {
		q({ value: o }, [o, ...i], n, t);
	}
	return r;
}
function We(e, t) {
	return {
		defaultMergeFunctions: v,
		mergeFunctions: {
			...v,
			...Object.fromEntries(
				Object.entries(e)
					.filter(([n, r]) => Object.hasOwn(v, n))
					.map(([n, r]) => (r === !1 ? [n, v.mergeOthers] : [n, r])),
			),
		},
		metaDataUpdater: e.metaDataUpdater ?? z,
		deepmergeInto: t,
		filterValues: e.filterValues === !1 ? void 0 : (e.filterValues ?? K),
		actions: M,
	};
}
function q(e, t, n, r) {
	let o = n.filterValues?.(t, r) ?? t;
	if (o.length === 0) return;
	if (o.length === 1) return void U(e, o, n, r);
	let i = A(e.value);
	if (i !== 0 && i !== 5) {
		for (let s = 1; s < o.length; s++)
			if (A(o[s]) !== i) return void U(e, o, n, r);
	}
	switch (i) {
		case 1:
			return void Le(e, o, n, r);
		case 2:
			return void He(e, o, n, r);
		case 3:
			return void Xe(e, o, n, r);
		case 4:
			return void ze(e, o, n, r);
		default:
			return void U(e, o, n, r);
	}
}
function Le(e, t, n, r) {
	n.mergeFunctions.mergeRecords(e, t, n, r) === M.defaultMerge &&
		n.defaultMergeFunctions.mergeRecords(e, t, n, r);
}
function He(e, t, n, r) {
	n.mergeFunctions.mergeArrays(e, t, n, r) === M.defaultMerge &&
		n.defaultMergeFunctions.mergeArrays(e, t);
}
function Xe(e, t, n, r) {
	n.mergeFunctions.mergeSets(e, t, n, r) === M.defaultMerge &&
		n.defaultMergeFunctions.mergeSets(e, t);
}
function ze(e, t, n, r) {
	n.mergeFunctions.mergeMaps(e, t, n, r) === M.defaultMerge &&
		n.defaultMergeFunctions.mergeMaps(e, t);
}
function U(e, t, n, r) {
	(n.mergeFunctions.mergeOthers(e, t, n, r) === M.defaultMerge ||
		e.value === M.defaultMerge) &&
		n.defaultMergeFunctions.mergeOthers(e, t);
}
var d,
	M,
	H,
	X,
	D,
	v,
	P = f(() => {
		"use strict";
		((d = {
			defaultMerge: Symbol("deepmerge-ts: default merge"),
			skip: Symbol("deepmerge-ts: skip"),
		}),
			(M = { defaultMerge: d.defaultMerge }));
		(function (e) {
			((e[(e.NOT = 0)] = "NOT"),
				(e[(e.RECORD = 1)] = "RECORD"),
				(e[(e.ARRAY = 2)] = "ARRAY"),
				(e[(e.SET = 3)] = "SET"),
				(e[(e.MAP = 4)] = "MAP"),
				(e[(e.OTHER = 5)] = "OTHER"));
		})(H || (H = {}));
		X = ["[object Object]", "[object Module]"];
		D = {
			mergeRecords: ve,
			mergeArrays: Re,
			mergeSets: $e,
			mergeMaps: Ne,
			mergeOthers: Fe,
		};
		v = {
			mergeRecords: Be,
			mergeArrays: Pe,
			mergeSets: Ze,
			mergeMaps: je,
			mergeOthers: ke,
		};
	});
var ie = {};
l(ie, {
	MAX_ULID: () => Ke,
	MIN_ULID: () => Je,
	TIME_LEN: () => p,
	TIME_MAX: () => N,
	ULIDError: () => c,
	ULIDErrorCode: () => a,
	decodeTime: () => rt,
	encodeTime: () => F,
	fixULIDBase32: () => nt,
	incrementBase32: () => ne,
	isValid: () => st,
	monotonicFactory: () => at,
	ulid: () => ct,
	ulidToUUID: () => ut,
	uuidToULID: () => ft,
});
function qe(e) {
	let t = Math.floor(e() * E) % E;
	return w.charAt(t);
}
function ee(e, t, n) {
	return t > e.length - 1 ? e : e.substr(0, t) + n + e.substr(t + 1);
}
function et(e) {
	let t = [],
		n = 0,
		r = 0,
		o = new Uint8Array(e.slice().reverse());
	for (let i of o)
		for (r |= i << n, n += 8; n >= 5; )
			(t.unshift(r & 31), (r >>>= 5), (n -= 5));
	return (n > 0 && t.unshift(r & 31), t.map((i) => te.charAt(i)).join(""));
}
function tt(e) {
	let t = e.toUpperCase().split("").reverse().join(""),
		n = [],
		r = 0,
		o = 0;
	for (let i of t) {
		let s = te.indexOf(i);
		if (s === -1)
			throw new Error(`Invalid base 32 character found in string: ${i}`);
		for (o |= s << r, r += 5; r >= 8; )
			(n.unshift(o & 255), (o >>>= 8), (r -= 8));
	}
	return ((r >= 5 || o > 0) && n.unshift(o & 255), new Uint8Array(n));
}
function nt(e) {
	return e
		.replace(/i/gi, "1")
		.replace(/l/gi, "1")
		.replace(/o/gi, "0")
		.replace(/-/g, "");
}
function ne(e) {
	let t,
		n = e.length,
		r,
		o,
		i = e,
		s = E - 1;
	for (; !t && n-- >= 0; ) {
		if (((r = i[n]), (o = w.indexOf(r)), o === -1))
			throw new c(
				a.Base32IncorrectEncoding,
				"Incorrectly encoded string",
			);
		if (o === s) {
			i = ee(i, n, w[0]);
			continue;
		}
		t = ee(i, n, w[o + 1]);
	}
	if (typeof t == "string") return t;
	throw new c(a.Base32IncorrectEncoding, "Failed incrementing string");
}
function rt(e) {
	if (e.length !== p + S)
		throw new c(a.DecodeTimeValueMalformed, "Malformed ULID");
	let t = e
		.substr(0, p)
		.toUpperCase()
		.split("")
		.reverse()
		.reduce((n, r, o) => {
			let i = w.indexOf(r);
			if (i === -1)
				throw new c(
					a.DecodeTimeInvalidCharacter,
					`Time decode error: Invalid character: ${r}`,
				);
			return (n += i * Math.pow(E, o));
		}, 0);
	if (t > N)
		throw new c(
			a.DecodeTimeValueMalformed,
			`Malformed ULID: timestamp too large: ${t}`,
		);
	return t;
}
function re(e) {
	let t = ot(),
		n = (t && (t.crypto || t.msCrypto)) || (typeof $ < "u" ? $ : null);
	if (typeof n?.getRandomValues == "function")
		return () => {
			let r = new Uint8Array(1);
			return (n.getRandomValues(r), r[0] / 256);
		};
	if (typeof n?.randomBytes == "function")
		return () => n.randomBytes(1).readUInt8() / 256;
	if ($?.randomBytes) return () => $.randomBytes(1).readUInt8() / 256;
	throw new c(a.PRNGDetectFailure, "Failed to find a reliable PRNG");
}
function ot() {
	return it()
		? self
		: typeof window < "u"
			? window
			: typeof global < "u"
				? global
				: typeof globalThis < "u"
					? globalThis
					: null;
}
function oe(e, t) {
	let n = "";
	for (; e > 0; e--) n = qe(t) + n;
	return n;
}
function F(e, t = p) {
	if (isNaN(e))
		throw new c(a.EncodeTimeValueMalformed, `Time must be a number: ${e}`);
	if (e > N)
		throw new c(
			a.EncodeTimeSizeExceeded,
			`Cannot encode a time larger than ${N}: ${e}`,
		);
	if (e < 0) throw new c(a.EncodeTimeNegative, `Time must be positive: ${e}`);
	if (Number.isInteger(e) === !1)
		throw new c(
			a.EncodeTimeValueMalformed,
			`Time must be an integer: ${e}`,
		);
	let n,
		r = "";
	for (let o = t; o > 0; o--)
		((n = e % E), (r = w.charAt(n) + r), (e = (e - n) / E));
	return r;
}
function it() {
	return typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope;
}
function st(e) {
	return (
		typeof e == "string" &&
		e.length === p + S &&
		e
			.toUpperCase()
			.split("")
			.every((t) => w.indexOf(t) !== -1)
	);
}
function at(e) {
	let t = e || re(),
		n = 0,
		r;
	return function (i) {
		let s = !i || isNaN(i) ? Date.now() : i;
		if (s <= n) {
			let g = (r = ne(r));
			return F(n, p) + g;
		}
		n = s;
		let u = (r = oe(S, t));
		return F(s, p) + u;
	};
}
function ct(e, t) {
	let n = t || re(),
		r = !e || isNaN(e) ? Date.now() : e;
	return F(r, p) + oe(S, n);
}
function ut(e) {
	if (!Ye.test(e)) throw new c(a.ULIDInvalid, `Invalid ULID: ${e}`);
	let n = tt(e),
		r = Array.from(n)
			.map((o) => o.toString(16).padStart(2, "0"))
			.join("");
	return (
		(r =
			r.substring(0, 8) +
			"-" +
			r.substring(8, 12) +
			"-" +
			r.substring(12, 16) +
			"-" +
			r.substring(16, 20) +
			"-" +
			r.substring(20)),
		r.toUpperCase()
	);
}
function ft(e) {
	if (!Qe.test(e)) throw new c(a.UUIDInvalid, `Invalid UUID: ${e}`);
	let n = e.replace(/-/g, "").match(/.{1,2}/g);
	if (!n) throw new c(a.Unexpected, `Failed parsing UUID bytes: ${e}`);
	let r = new Uint8Array(n.map((o) => parseInt(o, 16)));
	return et(r);
}
var te,
	w,
	E,
	Ke,
	Je,
	S,
	p,
	N,
	Ye,
	Qe,
	a,
	c,
	se = f(() => {
		"use strict";
		((te = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"),
			(w = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"),
			(E = 32),
			(Ke = "7ZZZZZZZZZZZZZZZZZZZZZZZZZ"),
			(Je = "00000000000000000000000000"),
			(S = 16),
			(p = 10),
			(N = 0xffffffffffff),
			(Ye = /^[0-7][0-9a-hjkmnp-tv-zA-HJKMNP-TV-Z]{25}$/),
			(Qe = /^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/));
		(function (e) {
			((e.Base32IncorrectEncoding = "B32_ENC_INVALID"),
				(e.DecodeTimeInvalidCharacter = "DEC_TIME_CHAR"),
				(e.DecodeTimeValueMalformed = "DEC_TIME_MALFORMED"),
				(e.EncodeTimeNegative = "ENC_TIME_NEG"),
				(e.EncodeTimeSizeExceeded = "ENC_TIME_SIZE_EXCEED"),
				(e.EncodeTimeValueMalformed = "ENC_TIME_MALFORMED"),
				(e.PRNGDetectFailure = "PRNG_DETECT"),
				(e.ULIDInvalid = "ULID_INVALID"),
				(e.Unexpected = "UNEXPECTED"),
				(e.UUIDInvalid = "UUID_INVALID"));
		})(a || (a = {}));
		c = class extends Error {
			constructor(t, n) {
				(super(`${n} (${t})`),
					(this.name = "ULIDError"),
					(this.code = t));
			}
		};
	});
var ae = {};
l(ae, { default: () => lt });
var lt,
	ce = f(() => {
		"use strict";
		lt = async (...[e, t]) =>
			JSON.parse(
				(
					await (
						await import("node:fs/promises")
					).readFile(`${t ?? "."}/${e}`, "utf-8")
				).toString(),
			);
	});
var Z = {};
l(Z, { On: () => I, default: () => dt, posix: () => gt, sep: () => pt });
var I,
	dt,
	pt,
	gt,
	j = f(async () => {
		"use strict";
		((I = process.env.NODE_ENV === "development"),
			(dt = {
				color: !0,
				format: "esm",
				logLevel: "debug",
				metafile: !0,
				minify: !I,
				outdir: "Target",
				platform: "node",
				target: "esnext",
				tsconfig: "tsconfig.json",
				write: !0,
				legalComments: I ? "inline" : "none",
				bundle: !1,
				assetNames: "Asset/[name]-[hash]",
				sourcemap: I,
				drop: I ? [] : ["debugger"],
				ignoreAnnotations: !I,
				keepNames: I,
				plugins: [
					{
						name: "Target",
						setup({ onStart: e, initialOptions: { outdir: t } }) {
							e(async () => {
								try {
									t &&
										(await (
											await import("node:fs/promises")
										).rm(t, { recursive: !0 }));
								} catch (n) {
									console.log(n);
								}
							});
						},
					},
				],
				define: {
					"process.env.VERSION_PACKAGE": `'${(await (await Promise.resolve().then(() => (ce(), ae))).default("package.json"))?.version}'`,
				},
			}),
			({ sep: pt, posix: gt } = await import("node:path")));
	});
var ue = {};
l(ue, { default: () => mt, posix: () => O });
var mt,
	O,
	fe = f(async () => {
		"use strict";
		((mt = (e) => {
			let t = e
				.replace(/[.+^${}()|[\]\\]/g, "\\$&")
				.replace(/\*\*/g, ".*")
				.replace(/\*/g, `[^${O.sep}]+`);
			(!e.startsWith("**") &&
				!e.startsWith("*") &&
				(t = `(?:^|\\${O.sep})${t}`),
				!e.endsWith("**") && !e.endsWith("*")
					? (t = `${t}(?:\\${O.sep}|$)`)
					: !e.includes("*") && !e.includes("/") && e.startsWith(".")
						? (t = `${t}$`)
						: !e.includes("*") &&
							!e.includes("/") &&
							(t = `(?:^|\\${O.sep})${t}(?:\\${O.sep}|$)`));
			try {
				return new RegExp(t);
			} catch (n) {
				return (
					console.error(
						`[Exclude] Invalid regex generated from glob "${e}": ${t}`,
						n,
					),
					new RegExp("$.")
				);
			}
		}),
			({ posix: O } = await j().then(() => Z)));
	});
var de = {};
l(de, { _Regex: () => le, default: () => yt, posix: () => b, sep: () => k });
var yt,
	b,
	k,
	le,
	pe = f(async () => {
		"use strict";
		((yt = (e, t) => {
			if (!e) return !1;
			let n = e.split(k).join(b.sep);
			return t.some((r) => {
				if (!r) return !1;
				let o = r.split(k).join(b.sep);
				return (!o.includes("*") &&
					!o.startsWith(".") &&
					(n.includes(`${b.sep}${o}${b.sep}`) ||
						n.startsWith(`${o}${b.sep}`) ||
						n.endsWith(`${b.sep}${o}`) ||
						n === o)) ||
					(o.startsWith(".") &&
						!o.includes("*") &&
						!o.includes("/") &&
						n.endsWith(o)) ||
					(o.includes("*") && le(o).test(n))
					? !0
					: n.includes(o)
						? (console.warn(
								`[Exclude] Simple includes match (fallback): "${n}" includes "${o}"`,
							),
							!0)
						: !1;
			});
		}),
			({ posix: b, sep: k } = await j().then(() => Z)),
			({ default: le } = await fe().then(() => ue)));
	});
var ge = {};
l(ge, { Exclude: () => T, default: () => ht });
var ht,
	T,
	me = f(async () => {
		"use strict";
		((ht = (e, t) => {
			let n = [];
			if (e.entryPoints) {
				let r = e.entryPoints;
				if (
					Array.isArray(r) &&
					(r.length === 0 || typeof r[0] == "string")
				)
					n = r.filter((o) => !T(o, t));
				else if (
					Array.isArray(r) &&
					r.length > 0 &&
					typeof r[0] == "object" &&
					r[0] !== null &&
					"in" in r[0]
				)
					n = r.filter((o) => !T(o.in, t));
				else if (
					!Array.isArray(r) &&
					typeof r == "object" &&
					r !== null
				) {
					let o = r,
						i = {};
					for (let s in o)
						if (Object.prototype.hasOwnProperty.call(o, s)) {
							let u = o[s];
							u !== void 0 && (T(u, t) || (i[s] = u));
						}
					n = i;
				} else Array.isArray(r) && r.length === 0 ? (n = []) : (n = r);
			} else n = [];
			return n;
		}),
			({ default: T } = await pe().then(() => de)));
	});
var ye = {};
l(ye, { default: () => Mt });
var Mt,
	he = f(() => {
		"use strict";
		Mt = async (...[e, t = async (n) => console.log(n)]) => {
			try {
				let { stdout: n, stderr: r } = (
					await import("child_process")
				).exec(e);
				typeof t == "function" &&
					(n?.on("data", async (o) => await t(o.trim())),
					r?.on("data", async (o) => await t(o.trim(), !0)));
			} catch (n) {
				console.log(n);
			}
		};
	});
var we = {};
l(we, {
	Bundle: () => wt,
	Compile: () => Me,
	Merge: () => G,
	On: () => x,
	default: () => It,
});
var x,
	wt,
	Me,
	G,
	It,
	Ie = f(async () => {
		"use strict";
		((x = (await h().then(() => y)).On),
			(wt = (await h().then(() => y)).Bundle),
			(Me = (await h().then(() => y)).Compile),
			(G = (await Promise.resolve().then(() => (P(), B))).deepmerge),
			(It = async (e) =>
				G((await h().then(() => y)).default, {
					outdir: "Target",
					drop: x ? [] : ["debugger", "console"],
					define: {
						__DEV__: x ? "true" : "false",
						__INCREMENT__: `"${`${x ? "DEVELOPMENT" : "PRODUCTION"}-${(await Promise.resolve().then(() => (se(), ie))).ulid()}`}"`,
					},
					treeShaking: !x,
					entryPoints: (await me().then(() => ge)).default(e, [
						"Source/Configuration/*",
					]),
					platform: "node",
					outbase: "Source",
					plugins: Me
						? G(e.plugins, [
								{
									name: "Compile",
									setup({ onEnd: t }) {
										t(async ({ metafile: n }) => {
											let r = n?.outputs;
											for (let o in r)
												Object.prototype.hasOwnProperty.call(
													r,
													o,
												) &&
													o.endsWith(".js") &&
													(
														await Promise.resolve().then(
															() => (he(), ye),
														)
													).default(
														`Build '${o}' 															--ESBuild Configuration/ESBuild/Target/Compile.js 															--TypeScript Configuration/tsconfig/Target/Compile.json`,
													);
										});
									},
								},
							])
						: [],
				})));
	});
var At = (await h().then(() => y)).On,
	xt = (await h().then(() => y)).Bundle,
	bt = (await Promise.resolve().then(() => (P(), B))).deepmergeCustom({
		mergeArrays: !1,
	}),
	Dt = async (e) =>
		bt(await (await Ie().then(() => we)).default(e), {
			bundle: !0,
			outbase: "Target",
			tsconfig: "Configuration/tsconfig/Target/Compile.json",
			plugins: [],
			allowOverwrite: !0,
		});
export { xt as Bundle, bt as Merge, At as On, Dt as default };
