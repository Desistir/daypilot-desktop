const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('daypilot',{call:(action,data)=>ipcRenderer.invoke('daypilot',action,data),onDock:fn=>{const listener=(_,state)=>fn(state);ipcRenderer.on('dock-state',listener);return()=>ipcRenderer.removeListener('dock-state',listener);}});
