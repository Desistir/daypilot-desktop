const clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
function distances(b,a){return {left:Math.abs(b.x-a.x),right:Math.abs(b.x+b.width-a.x-a.width),top:Math.abs(b.y-a.y),bottom:Math.abs(b.y+b.height-a.y-a.height)};}
function nearestEdge(b,a){const d=distances(b,a);return Object.keys(d).sort((x,y)=>d[x]-d[y])[0];}
function edgeFor(b,a){const edge=nearestEdge(b,a);return distances(b,a)[edge]<=24?edge:null;}
function dockBounds(edge,b,a,collapsed){const horizontal=edge==='top'||edge==='bottom',width=collapsed?(horizontal?124:48):360,height=collapsed?(horizontal?40:124):540;return {x:edge==='left'?a.x:edge==='right'?a.x+a.width-width:clamp(b.x,a.x,a.x+a.width-width),y:edge==='top'?a.y:edge==='bottom'?a.y+a.height-height:clamp(b.y,a.y,a.y+a.height-height),width,height};}
module.exports={edgeFor,dockBounds,nearestEdge};
