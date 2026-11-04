const dateKey=ms=>new Date(ms).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
export function urgency(task,now=Date.now()){
 if(task.completed)return {tone:'done',label:'已完成'};
 if(!task.due)return {tone:'later',label:'未设日期'};
 const due=Date.parse(task.due),delta=Math.round((Date.parse(dateKey(due))-Date.parse(dateKey(now)))/86400000);
 if(due<now)return {tone:'overdue',label:'已逾期'};
 if(delta===0)return {tone:'today',label:'今天'};
 if(delta===1)return {tone:'tomorrow',label:'明天'};
 if(delta<=7)return {tone:'week',label:'七天内'};
 return {tone:'later',label:'之后'};
}
export function sortTasks(tasks){return [...tasks].sort((a,b)=>Number(!!a.completed)-Number(!!b.completed)||(a.due?Date.parse(a.due):Infinity)-(b.due?Date.parse(b.due):Infinity)||b.priority-a.priority||a.id.localeCompare(b.id));}
