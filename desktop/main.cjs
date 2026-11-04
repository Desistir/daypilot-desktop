const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,screen}=require('electron');
const path=require('node:path');
const {openStore}=require('./store.cjs');
const {edgeFor,dockBounds,nearestEdge}=require('./dock.cjs');
let dockEdge=null,collapsed=false,dockArea,dockOrigin,changing=false,collapseTimer;
let main,widget,tray,store,quitting=false,popup;
app.setName('DayPilot');
app.setPath('userData',process.env.DAYPILOT_DATA_DIR||path.join(app.getPath('appData'),'daypilot-desktop'));
if(!app.requestSingleInstanceLock())app.quit();else{
app.on('second-instance',()=>{main?.show();main?.focus();});
app.whenReady().then(()=>{
 app.setAppUserModelId('com.daypilot.desktop');store=openStore(path.join(app.getPath('userData'),'daypilot.sqlite'));
 const appIcon=nativeImage.createFromPath(path.join(__dirname,'assets/icon.png'));
 function windowFor(hash,options){const w=new BrowserWindow({icon:appIcon,...options,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});w.loadFile(path.join(__dirname,'../dist/index.html'),{hash});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());return w;}
 main=windowFor('',{width:1320,height:870,minWidth:960,minHeight:660,backgroundColor:'#f6f7f9',title:'DayPilot',autoHideMenuBar:true});
 main.on('close',e=>{if(!quitting){e.preventDefault();main.hide();}});
 const area=screen.getPrimaryDisplay().workArea;
 widget=windowFor('widget',{width:360,height:540,x:area.x+area.width-380,y:area.y+40,alwaysOnTop:true,frame:false,resizable:false,skipTaskbar:true,backgroundColor:'#f8fbf8',title:'DayPilot · 桌面组件'});
 function dock(value){if(!dockEdge)return;clearTimeout(collapseTimer);collapsed=value;changing=true;widget.setBounds(dockBounds(dockEdge,dockOrigin,dockArea,value));widget.webContents.send('dock-state',{collapsed,edge:dockEdge});setTimeout(()=>changing=false,150);store.setting('dock',{edge:dockEdge,origin:dockOrigin,area:dockArea});}
 widget.on('moved',()=>{if(changing)return;if(collapsed){const b=widget.getBounds();dockArea=screen.getDisplayMatching(b).workArea;dockEdge=nearestEdge(b,dockArea);dockOrigin=b;dock(true);return;}const b=widget.getBounds(),a=screen.getDisplayMatching(b).workArea;dockEdge=edgeFor(b,a);dockArea=a;dockOrigin=b;if(dockEdge){clearTimeout(collapseTimer);collapseTimer=setTimeout(()=>dock(true),800);}else{store.setting('dock',null);widget.webContents.send('dock-state',{collapsed:false,edge:null});}});
 const saved=store.setting('dock');if(saved?.edge){dockEdge=saved.edge;dockOrigin=saved.origin;dockArea=screen.getDisplayMatching(saved.origin).workArea;widget.webContents.once('did-finish-load',()=>dock(true));}
 screen.on('display-metrics-changed',()=>{if(dockEdge){dockArea=screen.getDisplayMatching(widget.getBounds()).workArea;dock(collapsed);}});
 if(store.setting('widget')===false)widget.hide();widget.on('close',e=>{if(!quitting){e.preventDefault();widget.hide();store.setting('widget',false);}});
 const icon=appIcon.resize({width:32,height:32});
 tray=new Tray(icon);tray.setToolTip('DayPilot · 静音日程管家');tray.setContextMenu(Menu.buildFromTemplate([{label:'打开 DayPilot',click:()=>main.show()},{label:'显示小组件',click:()=>{widget.show();store.setting('widget',true);}},{label:'退出',click:()=>{quitting=true;app.quit();}}]));tray.on('double-click',()=>main.show());
 ipcMain.handle('daypilot',(event,action,data)=>{
 if(![main,widget,popup].some(w=>w&&!w.isDestroyed()&&w.webContents===event.sender))throw Error('访问被拒绝');
 
 switch(action){case 'dock-state':return {collapsed,edge:dockEdge};case 'dock-expand':dock(false);return true;case 'dock-leave':if(dockEdge){clearTimeout(collapseTimer);collapseTimer=setTimeout(()=>dock(true),900);}return true;case 'dock-enter':clearTimeout(collapseTimer);return true;case 'dock-now':{dockOrigin=widget.getBounds();dockArea=screen.getDisplayMatching(dockOrigin).workArea;dockEdge=nearestEdge(dockOrigin,dockArea);dock(true);return true;}case 'undock':dock(false);dockEdge=null;store.setting('dock',null);widget.setPosition(widget.getBounds().x-40,widget.getBounds().y+30);widget.webContents.send('dock-state',{collapsed:false,edge:null});return true;case 'list':return store.list();case 'save':return store.save(data);case 'complete':return store.complete(data);case 'backup':return store.backup();case 'settings':return {autostart:app.getLoginItemSettings({path:process.execPath,args:['--background']}).openAtLogin,widget:widget.isVisible(),packaged:app.isPackaged};case 'autostart':if(!app.isPackaged)throw Error('请在打包后的运行版中设置开机自启');app.setLoginItemSettings({openAtLogin:!!data,path:process.execPath,args:['--background']});return true;case 'widget':clearTimeout(collapseTimer);store.setting('widget',!!data);data?widget.show():widget.hide();return true;case 'open':main.show();main.focus();return true;case 'dismiss':popup?.close();return true;default:throw Error('未知操作');}
 });
 function remind(){const due=store.list().filter(t=>!t.completed&&t.due&&Date.parse(t.due)<=Date.now()+3600000&&store.db.prepare('SELECT stamp FROM reminders WHERE task=?').get(t.id)?.stamp!==new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}));
 if(!due.length||popup&&!popup.isDestroyed())return;
 popup=windowFor('reminder',{width:400,height:430,x:area.x+area.width-420,y:area.y+area.height-450,alwaysOnTop:true,autoHideMenuBar:true,title:'DayPilot 提醒'});
 for(const t of due)store.db.prepare('INSERT OR REPLACE INTO reminders VALUES(?,?)').run(t.id,new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}));}
 setInterval(remind,30000);setTimeout(remind,4000);
 if(process.argv.includes('--background'))main.hide();
 });app.on('before-quit',()=>quitting=true);app.on('window-all-closed',()=>{});
}
