import { TextEdit as I, WorkspaceEdit as p } from "../Type/ExtHostTypes.js";
import { TextEdit as d, URI as t } from "./Main.js";

const u = (n, r) => {
		const s = { edits: [] };
		for (const [e, i] of n.entries())
			if (i.length > 0 && i[0] instanceof I) {
				const o = t.FromAPI(e),
					c = r?.GetTextDocumentVersion(e);
				for (const a of i)
					s.edits.push({
						resource: o,
						textEdit: d.FromAPI(a),
						versionId: c,
					});
			} else
				for (const o of i)
					s.edits.push({
						oldResource: o.oldUri ? t.FromAPI(o.oldUri) : void 0,
						newResource: o.newUri ? t.FromAPI(o.newUri) : void 0,
						options: o.options,
						metadata: o.metadata,
					});
		return s;
	},
	E = (n) => {
		const r = new p();
		for (const s of n.edits)
			if ("textEdit" in s) {
				const e = s,
					i = t.ToAPI(e.resource),
					o = [d.ToAPI(e.textEdit)];
				r.set(i, o);
			} else {
				const e = s;
				e.oldResource && e.newResource
					? r.renameFile(
							t.ToAPI(e.oldResource),
							t.ToAPI(e.newResource),
							e.options,
						)
					: e.newResource
						? r.createFile(t.ToAPI(e.newResource), e.options)
						: e.oldResource &&
							r.deleteFile(t.ToAPI(e.oldResource), e.options);
			}
		return r;
	};
var l = { FromAPI: u, ToAPI: E };
export { l as default };
