const r=process.env.Trace??"",n=r.split(",").map(t=>t.trim().toLowerCase()).filter(t=>t.length>0),e=new Set(n),a=e.has("short"),c=e.has("all"),i=t=>e.size===0?!1:c||a?!0:e.has(t.toLowerCase()),l=(t,s)=>{if(!i(t))return;const o=t.toUpperCase();process.stdout.write(`[DEV:${o}] ${s}
`)};var p=l;export{l as CocoonDevLog,p as default};
