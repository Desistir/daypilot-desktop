const {DatabaseSync}=require('node:sqlite');
const {mkdirSync,copyFileSync}=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
function openStore(file){
 mkdirSync(path.dirname(file),{recursive:true});
 const db=new DatabaseSync(file); db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 const version=db.prepare('PRAGMA user_version').get().user_version;
 if(version>1) throw Error('数据库版本较新，请更新 DayPilot');
 if(version===0){
 db.exec(`BEGIN; CREATE TABLE tasks(id TEXT PRIMARY KEY,title TEXT NOT NULL,notes TEXT DEFAULT '',kind TEXT DEFAULT 'task',due TEXT,start TEXT,end TEXT,priority INTEGER DEFAULT 1,completed TEXT,progress INTEGER,target INTEGER,recurrence TEXT DEFAULT 'none'); CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE audit(id INTEGER PRIMARY KEY,at TEXT,action TEXT,payload TEXT); CREATE TABLE reminders(task TEXT PRIMARY KEY,stamp TEXT); PRAGMA user_version=1; COMMIT;`);

 }
 function list(){return db.prepare('SELECT * FROM tasks ORDER BY completed IS NOT NULL,due IS NULL,due,priority DESC').all();}
 function save(input){
 const old=input.id?db.prepare('SELECT * FROM tasks WHERE id=?').get(input.id):null;
 if(input.id&&!old)throw Error('任务不存在');
 const t={id:randomUUID(),title:'',notes:'',kind:'task',due:null,start:null,end:null,priority:1,completed:null,progress:null,target:null,recurrence:'none',...old,...input};
 if(typeof t.title!=='string'||!t.title.trim()||t.title.length>300)throw Error('请输入有效标题');
 if(!['task','event','goal'].includes(t.kind)||!['none','daily','weekly'].includes(t.recurrence))throw Error('类型无效');
 for(const k of ['due','start','end','completed'])if(t[k]!==null&&(!/([Zz]|[+-]\d\d:\d\d)$/.test(t[k])||!Number.isFinite(Date.parse(t[k]))))throw Error('时间必须包含时区');
 if(![0,1,2].includes(t.priority))throw Error('优先级无效');
 if(t.target!==null&&(!Number.isInteger(t.target)||t.target<=0))throw Error('目标次数无效');
 if(t.progress!==null&&(!Number.isInteger(t.progress)||t.progress<0||(t.target!==null&&t.progress>t.target)))throw Error('进度超出范围');
 const keys=['id','title','notes','kind','due','start','end','priority','completed','progress','target','recurrence'];
 db.exec('BEGIN IMMEDIATE');try{
 db.prepare(`INSERT OR REPLACE INTO tasks(${keys}) VALUES(${keys.map(()=>'?')})`).run(...keys.map(k=>t[k]));
 db.prepare('DELETE FROM reminders WHERE task=?').run(t.id);
 db.prepare('INSERT INTO audit(at,action,payload) VALUES(?,?,?)').run(new Date().toISOString(),old?'update':'create',JSON.stringify(t));db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}return t;
 }
 function complete(id){const t=list().find(t=>t.id===id);if(!t)throw Error('任务不存在');if(t.completed)return t;
 if(t.kind==='goal'&&t.target!==null){
 db.exec('BEGIN IMMEDIATE');try{
 const current=db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
 if(current.progress===null)throw Error('请先确认此前已完成次数');
 if(!current.completed){const progress=Math.min(current.target,current.progress+1),completed=progress===current.target?new Date().toISOString():null;
 db.prepare('UPDATE tasks SET progress=?,completed=? WHERE id=?').run(progress,completed,id);
 db.prepare('INSERT INTO audit(at,action,payload) VALUES(?,?,?)').run(new Date().toISOString(),'goal_increment',JSON.stringify({id,progress,completed}));}
 db.exec('COMMIT');return db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
 }catch(e){db.exec('ROLLBACK');throw e;}}
 const result=save({id,completed:new Date().toISOString()});
 if(t.recurrence!=='none'&&t.due){const next=new Date(Date.parse(t.due)+(t.recurrence==='daily'?1:7)*86400000);const {id:_,...rest}=t;save({...rest,completed:null,due:next.toISOString()});}return result;}
 return {db,list,save,complete,setting(key,value){if(value!==undefined)db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key,JSON.stringify(value));return JSON.parse(db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value??'null');},backup(){const dest=path.join(path.dirname(file),'backups',`daypilot-${Date.now()}-${randomUUID()}.sqlite`);mkdirSync(path.dirname(dest),{recursive:true});db.prepare('VACUUM INTO ?').run(dest);return dest;}};
}
module.exports={openStore};
