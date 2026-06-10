const e={Ok:r=>({success:!0,value:r}),Err:r=>({success:!1,error:r}),IsOk:r=>r.success,IsErr:r=>!r.success},s=e.Ok,E=e.Err;var t=e;export{E as Err,s as Ok,e as Result,t as default};
