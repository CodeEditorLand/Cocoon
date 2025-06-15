import{Effect as e}from"effect";const o=t=>e.sync(()=>{t.close()}).pipe(e.tap(()=>e.logInfo("gRPC client connection closed.")));var n=o;export{n as default};
