import{Effect as e}from"effect";const c=o=>e.sync(()=>{o.close()}).pipe(e.tap(()=>e.logInfo("gRPC client connection closed.")));var r=c;export{r as default};
