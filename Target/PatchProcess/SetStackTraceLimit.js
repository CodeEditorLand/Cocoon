import{Effect as r}from"effect";const t=r.sync(()=>{Error.stackTraceLimit=100}).pipe(r.tap(()=>r.logTrace("Increased `Error.stackTraceLimit` to 100.")));var e=t;export{e as default};
