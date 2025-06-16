import{Effect as e}from"effect";const n=t=>e.sync(()=>{t.close()}).pipe(e.tap(()=>e.logInfo("gRPC client connection closed.")));var c=n;export{c as default};
