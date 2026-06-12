/**
 * @module Codegen/Type/ExtHostDecoratorRecord
 * @description
 * Cocoon-side analogue of Wind's `ServiceDecoratorRecord`. The
 * extension-host has its own decorator family - `IExtHost*` -
 * declared under `vs/workbench/api/common/extHost*.ts`. Same shape:
 * one record per `createDecorator(...)` call site, members extracted
 * from the matching interface declaration, source location pinned
 * for back-linking.
 *
 * Distinct from Wind's record because the consumers are different
 * (Cocoon's main process vs Wind's renderer-side workbench bridge),
 * but the schema mirrors Wind's so a future codegen consolidation
 * can collapse them.
 * @category Type
 */

// @ts-ignore — Wind Codegen types; resolved from Target at runtime
import type { InterfaceMemberRecord } from "@codeeditorland/wind/Target/Codegen/Type/InterfaceMemberRecord.js";

export interface ExtHostDecoratorRecord {
	readonly DecoratorName: string;

	readonly DecoratorTag: string;

	readonly InterfaceName: string;

	readonly SourcePath: string;

	readonly SourceLine: number;

	readonly Members: ReadonlyArray<InterfaceMemberRecord>;

	readonly DecoratorDocComment: string | null;

	readonly InterfaceDocComment: string | null;

	/** ExtHost decorators frequently come paired with a "MainThread"
	 * counterpart in `mainThreadFoo.ts`. The codegen records that
	 * paired identifier when the convention holds so consumers can
	 * navigate both ends of the RPC.
	 */
	readonly MainThreadCounterpart: string | null;
}
