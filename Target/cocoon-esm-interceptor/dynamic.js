import i from"./dynamic.template.js";function l(t,o){typeof t!="string"||t.length;const n=Object.keys(o).map(r=>`export const ${r} = __apiInstance['${r}'];`).join(`
`);let e=i;return e=e.replace(/__RUNTIME_API_KEY__/g,t),e=e.replace(/__RUNTIME_EXPORT_STATEMENTS__/g,n),e}export{l as createDynamicVscodeModuleScript};
