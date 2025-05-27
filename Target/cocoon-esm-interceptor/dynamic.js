import c from"./dynamic.template.js";function p(o,t){typeof o!="string"||o.length;const r=Object.keys(t).map(n=>`export const ${n} = __apiInstance['${n}'];`).join(`
`);let e=c;return e=e.replace(/__RUNTIME_API_KEY__/g,o),e=e.replace(/__RUNTIME_EXPORT_STATEMENTS__/g,r),e}export{p as createDynamicVscodeModuleScript};
