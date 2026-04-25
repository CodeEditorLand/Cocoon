function e(o,t){return t.Has(o)?"local":"mountain"}var n=(o,t)=>{process.env.LAND_DEV_LOG?.includes("cmd-route")&&process.stdout.write(`[DEV:CMD-ROUTE] cmd=${o} route=${t}
`)};export{n as LogRoute,e as Route};
