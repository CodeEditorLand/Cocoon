import * as a from "../Type/ExtHostTypes.js";
import { MarkdownString as h, URI as r } from "./Main.js";

const V = {
		FromAPI: (e) => ({
			showCollapseAll: !!e.showCollapseAll,
			canSelectMany: !!e.canSelectMany,
			hasHandleDrag: !!e.dragAndDropController?.handleDrag,
			hasHandleDrop: !!e.dragAndDropController?.handleDrop,
		}),
	},
	b = {
		FromAPI: (e, l, n, p, I) => {
			const {
				label: d,
				id: f,
				iconPath: i,
				resourceUri: s,
				tooltip: t,
				collapsibleState: C,
				contextValue: u,
				description: S,
				command: c,
				accessibilityInformation: g,
			} = l;
			let m, o;
			return (
				i instanceof a.ThemeIcon
					? (m = { id: i.id, color: i.color?.id })
					: (o = i),
				{
					handle: n,
					parentHandle: p,
					label: typeof d == "string" ? { label: d } : d,
					id: f,
					description: S,
					resourceUri: s ? r.FromAPI(s) : void 0,
					tooltip:
						typeof t == "string"
							? t
							: t instanceof a.MarkdownString
								? h.FromAPI(t)
								: void 0,
					command: c ? I.ToInternal(c, []) : void 0,
					collapsibleState: C ?? a.TreeItemCollapsibleState.None,
					contextValue: u,
					themeIcon: m,
					icon: o
						? "light" in o && "dark" in o
							? {
									light: r.FromAPI(o.light),
									dark: r.FromAPI(o.dark),
								}
							: r.FromAPI(o)
						: void 0,
					accessibilityInformation: g,
				}
			);
		},
		ToAPI: (e) => {
			const l = e.label.label,
				n = new a.TreeItem(l, e.collapsibleState);
			return (
				(n.id = e.id),
				(n.description = e.description),
				(n.resourceURI = e.resourceUri
					? r.ToAPI(e.resourceUri)
					: void 0),
				n
			);
		},
	},
	U = { Option: V, Item: b };
export { U as TreeView };
