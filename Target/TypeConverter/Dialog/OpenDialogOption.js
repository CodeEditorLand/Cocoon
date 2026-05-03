var r=e=>{if(e)return Object.entries(e).map(([t,i])=>({name:t,extensions:i}))};var a=e=>{if(e)return{...e,defaultUri:e.defaultUri?.toJSON(),filters:r(e.filters)}};export{a as ToDTO};
