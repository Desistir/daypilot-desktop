const path=require('node:path');
const {openStore}=require('./store.cjs');
async function main(){
 const {McpServer}=await import('@modelcontextprotocol/sdk/server/mcp.js');
 const {StdioServerTransport}=await import('@modelcontextprotocol/sdk/server/stdio.js');
 const {z}=await import('zod');
 const store=openStore(process.env.DAYPILOT_DB||path.join(process.env.APPDATA,'daypilot-desktop','daypilot.sqlite'));
 const server=new McpServer({name:'daypilot',version:'0.1.0'});
 const result=data=>({content:[{type:'text',text:JSON.stringify(data)}]});
 const wrap=fn=>async args=>{try{return result(await fn(args));}catch(e){return {...result({error:e.message}),isError:true}}};
 server.tool('list_tasks','查询任务，包括历史记录',{include_completed:z.boolean().optional()},wrap(a=>store.list().filter(t=>a.include_completed||!t.completed)));
 const fields={title:z.string().min(1).max(300),notes:z.string().optional(),kind:z.enum(['task','event','goal']).optional(),due:z.string().nullable().optional(),start:z.string().nullable().optional(),end:z.string().nullable().optional(),priority:z.number().int().min(0).max(2).optional(),target:z.number().int().positive().nullable().optional(),progress:z.number().int().nonnegative().nullable().optional(),recurrence:z.enum(['none','daily','weekly']).optional()};
 server.tool('add_task','创建任务；日期必须包含时区',fields,wrap(a=>store.save(a)));
 server.tool('update_task','修改任务', {id:z.string(),...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.optional()]))},wrap(a=>store.save(a)));
 server.tool('complete_task','完成任务并保留历史',{id:z.string()},wrap(a=>store.complete(a.id)));
 server.tool('update_goal_progress','设置已确认的目标进度，不推测未知次数',{id:z.string(),progress:z.number().int().nonnegative()},wrap(a=>{const g=store.list().find(t=>t.id===a.id);if(g?.kind!=='goal')throw Error('不是目标');return store.save(a)}));
 server.tool('backup','备份本地数据库',{},wrap(()=>({path:store.backup()})));
 await server.connect(new StdioServerTransport());
}main().catch(e=>{console.error(e);process.exitCode=1});
