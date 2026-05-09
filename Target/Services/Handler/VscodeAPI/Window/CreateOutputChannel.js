var s=(t,o,u,r)=>{let i=typeof r=="object"&&r!==null?r.log===!0:!1;t.SendToMountain("outputChannel.create",{handle:o,name:u,log:i}).catch(()=>{});let e=n=>{t.SendToMountain("outputChannel.append",{handle:o,name:u,value:n}).catch(()=>{})};return{name:u,append:e,appendLine:n=>e(`${n}
`),clear:()=>{t.SendToMountain("outputChannel.clear",{handle:o}).catch(()=>{})},show:()=>{t.SendToMountain("outputChannel.show",{handle:o}).catch(()=>{})},hide:()=>{t.SendToMountain("outputChannel.hide",{handle:o}).catch(()=>{})},replace:n=>{t.SendToMountain("outputChannel.clear",{handle:o}).catch(()=>{}),e(n)},dispose:()=>{t.SendToMountain("outputChannel.dispose",{handle:o}).catch(()=>{})},logLevel:2,onDidChangeLogLevel:n=>({dispose:()=>{}}),trace:(n,...a)=>e(`[trace] ${n}
`),debug:(n,...a)=>e(`[debug] ${n}
`),info:(n,...a)=>e(`[info] ${n}
`),warn:(n,...a)=>e(`[warn] ${n}
`),error:(n,...a)=>{let l=n instanceof Error?n.stack??n.message:String(n);e(`[error] ${l}
`)}}};export{s as default};
