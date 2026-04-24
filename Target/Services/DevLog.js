var r=process.env.LAND_DEV_LOG??"",n=r.split(",").map(t=>t.trim().toLowerCase()).filter(t=>t.length>0),s=new Set(n),a=s.has("short"),i=s.has("all"),c=t=>s.size===0?!1:i||a?!0:s.has(t.toLowerCase()),l=(t,e)=>{if(!c(t))return;let o=t.toUpperCase();process.stdout.write(`[DEV:${o}] ${e}
`)},p=l;export{l as CocoonDevLog,p as default};
