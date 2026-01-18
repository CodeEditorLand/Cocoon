import{SerializeFilters as r}from"./Filter.js";const t=e=>{if(e)return{...e,defaultUri:e.defaultUri?.toJSON(),filters:r(e.filters)}};export{t as ToDTO};
