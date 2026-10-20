const USERNAME='YACIINE105';
const REFRESH_INTERVAL=5*60*1000;
const CACHE_KEY='mohammad-github-commits-v1';

export class GitHubError extends Error {
 constructor(message,retryAt=0){super(message);this.name='GitHubError';this.retryAt=retryAt;}
}

export async function fetchRecentCommits({apiBase='https://api.github.com',username=USERNAME,signal}={}){
 const url=new URL(apiBase.replace(/\/$/,'')+'/search/commits');
 url.search=new URLSearchParams({q:'author:'+username,sort:'author-date',order:'desc',per_page:'6'});
 const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',signal:signal||AbortSignal.timeout(10000)});
 if(!response.ok){
  const reset=Number(response.headers.get('x-ratelimit-reset'))*1000;
  const retryAfter=response.headers.get('retry-after');
  const retrySeconds=Number(retryAfter);
  const retryAt=retryAfter?(Number.isFinite(retrySeconds)?Date.now()+retrySeconds*1000:Date.parse(retryAfter)):reset;
  throw new GitHubError(response.status===403||response.status===429?'GitHub is taking a breather. Please try again later.':'GitHub is temporarily unavailable.',Number.isFinite(retryAt)?retryAt:Date.now()+60000);
 }
 const data=await response.json();
 if(!Array.isArray(data.items)||!Number.isInteger(data.total_count)||data.incomplete_results===true)throw new GitHubError('GitHub returned incomplete activity.');
 const commits=data.items.map(item=>{
  const repository=item.repository?.full_name;
  const date=item.commit?.author?.date;
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository||'')||!/^[a-f0-9]{40}$/i.test(item.sha||'')||typeof item.commit?.message!=='string'||!Number.isFinite(Date.parse(date)))throw new GitHubError('GitHub returned invalid activity.');
  return{sha:item.sha,repository,date,message:item.commit.message.split('\n')[0].slice(0,240)};
 }).sort((first,second)=>Date.parse(second.date)-Date.parse(first.date));
 const seen=new Set();
 return{commits:commits.filter(commit=>{const key=commit.repository+commit.sha;if(seen.has(key))return false;seen.add(key);return true;}),total:data.total_count,updatedAt:Date.now()};
}

function validCache(cache){
 return cache&&Number.isFinite(cache.updatedAt)&&cache.updatedAt<=Date.now()+60000&&Date.now()-cache.updatedAt<7*24*60*60*1000&&Number.isInteger(cache.total)&&Array.isArray(cache.commits)&&cache.commits.length<=6&&cache.commits.every(commit=>/^[\w.-]+\/[\w.-]+$/.test(commit.repository||'')&&/^[a-f0-9]{40}$/i.test(commit.sha||'')&&typeof commit.message==='string'&&commit.message.length<=240&&Number.isFinite(Date.parse(commit.date)));
}

export function formatCommitAge(date,now=Date.now()){
 const seconds=Math.max(0,Math.floor((now-Date.parse(date))/1000));
 if(seconds<60)return'just now';
 if(seconds<3600)return Math.floor(seconds/60)+'m ago';
 if(seconds<86400)return Math.floor(seconds/3600)+'h ago';
 if(seconds<604800)return Math.floor(seconds/86400)+'d ago';
 return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'Africa/Cairo'}).format(new Date(date));
}

function initializeActivity(){
 const list=document.getElementById('commit-list');
 const status=document.getElementById('commit-status');
 const message=document.getElementById('commits-message');
 const refreshButton=document.getElementById('refresh-commits');
 let cache=null;
 let inFlight=false;
 let lastAttempt=0;
 let retryAt=0;
 try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY));if(validCache(saved))cache=saved;}catch{}
 function renderCommits(data){
  const fragment=document.createDocumentFragment();
  data.commits.forEach(commit=>{
   const item=document.createElement('li');item.className='commit-item';
   const dot=document.createElement('span');dot.className='commit-dot';dot.textContent='⑂';dot.setAttribute('aria-hidden','true');
   const content=document.createElement('div');content.className='commit-content';
   const title=document.createElement('a');title.className='commit-title';title.href='https://github.com/'+commit.repository+'/commit/'+commit.sha;title.target='_blank';title.rel='noopener noreferrer';
   const titleText=document.createElement('bdi');titleText.dir='auto';titleText.textContent=commit.message||'View commit';title.appendChild(titleText);
   const meta=document.createElement('div');meta.className='commit-meta';
   const repository=document.createElement('a');repository.href='https://github.com/'+commit.repository;repository.target='_blank';repository.rel='noopener noreferrer';repository.dir='ltr';repository.textContent=commit.repository;
   const sha=document.createElement('bdi');sha.dir='ltr';sha.textContent=commit.sha.slice(0,7);
   meta.append(repository,sha);content.append(title,meta);
   const time=document.createElement('time');time.className='commit-time';time.dateTime=commit.date;time.dir='ltr';time.title=new Date(commit.date).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' Cairo';time.textContent=formatCommitAge(commit.date);
   item.append(dot,content,time);fragment.appendChild(item);
  });
  list.replaceChildren(fragment);
  message.hidden=data.commits.length>0;
  message.textContent='No public commits found yet. New work will appear here automatically.';
 }
 if(cache){renderCommits(cache);status.textContent='Saved activity';}
 async function refreshCommits(force=false){
  if(inFlight)return;
  const now=Date.now();
  if(now<retryAt){status.textContent='Retry later';return;}
  if(now-lastAttempt<60000){status.textContent='Up to date';return;}
  if(!force&&cache&&now-cache.updatedAt<REFRESH_INTERVAL){status.textContent='Up to date';return;}
  inFlight=true;lastAttempt=now;refreshButton.disabled=true;list.setAttribute('aria-busy','true');status.textContent='Updating…';
  try{
   cache=await fetchRecentCommits();renderCommits(cache);
   try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache));}catch{}
   status.textContent='Updated '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Cairo'}).format(new Date(cache.updatedAt));
   status.title='Latest public commits indexed by GitHub. Search indexing can take a little time.';
  }catch(error){
   retryAt=Math.max(Date.now()+60000,error.retryAt||0);
   status.textContent=cache?'Saved · offline':'Unavailable';
   message.hidden=false;
   message.textContent=cache?'Showing saved activity from '+new Date(cache.updatedAt).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' (Cairo). Refresh will retry automatically.':'Couldn’t load recent commits. Try Refresh in a minute, or explore them on GitHub below.';
  }finally{inFlight=false;refreshButton.disabled=false;list.setAttribute('aria-busy','false');}
 }
 refreshButton.addEventListener('click',()=>refreshCommits(true));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(cache)renderCommits(cache);refreshCommits();}});
 setInterval(()=>{if(!document.hidden){if(cache)renderCommits(cache);refreshCommits();}},REFRESH_INTERVAL);
 refreshCommits();

 async function loadContributions(){
  try{
   const response=await fetch('https://github-contributions-api.jogruber.de/v4/'+USERNAME+'?y=last',{signal:AbortSignal.timeout(10000),credentials:'omit'});
   if(!response.ok)throw new Error('Unavailable');
   const data=await response.json();
   if(!Array.isArray(data.contributions))throw new Error('Invalid activity');
   const rows=data.contributions.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.date)&&Number.isFinite(Date.parse(day.date))&&Number.isInteger(day.count)&&day.count>=0&&Number.isInteger(day.level)&&day.level>=0&&day.level<=4).sort((first,second)=>first.date.localeCompare(second.date));
   if(rows.length<28||rows.length>371||new Set(rows.map(day=>day.date)).size!==rows.length)throw new Error('Incomplete activity');
   const grid=document.getElementById('contribution-grid');
   const fragment=document.createDocumentFragment();
   const offset=new Date(rows[0].date+'T00:00:00Z').getUTCDay();
   for(let index=0;index<offset;index++){const space=document.createElement('span');space.style.visibility='hidden';fragment.appendChild(space);}
   rows.forEach(day=>{const cell=document.createElement('span');cell.className='contribution-cell';cell.dataset.level=day.level;cell.title=day.count+' contribution'+(day.count===1?'':'s')+' on '+day.date;fragment.appendChild(cell);});
   grid.replaceChildren(fragment);
   const total=rows.reduce((count,day)=>count+day.count,0);
   grid.setAttribute('aria-label',total.toLocaleString()+' GitHub contributions between '+rows[0].date+' and '+rows[rows.length-1].date+'; newest at right');
   document.getElementById('activity-caption').textContent=total.toLocaleString()+' contributions in the last 12 months · @'+USERNAME;
   document.getElementById('activity-graph').hidden=false;
   document.getElementById('activity-fallback').hidden=true;
  }catch{/* Keep repository links when activity is unavailable. */}
 }
 loadContributions();
}

if(typeof document!=='undefined')initializeActivity();
