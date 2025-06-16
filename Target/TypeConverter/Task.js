const s = (e, n) => {
		const i = e.definition,
			o = e.execution,
			t = {
				_id: e._id,
				definition: { ...i, type: i.type },
				name: e.name,
				source: {
					id: n.identifier.value,
					label: e.source,
					scope: e.scope,
				},
				execution: void 0,
				isBackground: e.isBackground,
				group: e.group?.id,
				presentationOptions: e.presentationOptions,
				problemMatchers: e.problemMatchers,
				hasDefinedMatchers: e.hasDefinedMatchers,
			};
		return o && (t.execution = { ...o }), t;
	},
	c = (e) => {
		const n = e.execution
				? new ProcessExecution(
						e.execution.process,
						e.execution.args,
						e.execution.options,
					)
				: void 0,
			i = new ExtHostTask(
				e.definition,
				e.source.scope,
				e.source.label,
				e.source.id,
				n,
				e.problemMatchers,
			);
		return (i._id = e._id), i;
	},
	r = { ToAPI: (e, n) => ({ task: n, terminate: () => {} }) },
	u = { FromAPI: s, ToAPI: c, Execution: r };
export { u as Task };
