const USERNAME='YACIINE105';
const REFRESH_INTERVAL=5*60*1000;
const CACHE_KEY='mohammad-github-commits-v1';
const PR_CACHE_KEY='mohammad-github-prs-v1';

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

export async function fetchRecentPullRequests({apiBase='https://api.github.com',username=USERNAME,signal}={}){
 const url=new URL(apiBase.replace(/\/$/,'')+'/search/issues');
 url.search=new URLSearchParams({q:'author:'+username+' type:pr',sort:'created',order:'desc',per_page:'6'});
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
 const pulls=data.items.map(item=>{
  const repoMatch=item.repository_url?.match(/repos\/([\w.-]+\/[\w.-]+)$/)||item.html_url?.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/\d+$/);
  const repository=repoMatch?repoMatch[1]:'';
  const number=item.number;
  const title=typeof item.title==='string'?item.title.split('\n')[0].slice(0,240):'';
  const url=item.html_url||('https://github.com/'+repository+'/pull/'+number);
  const date=item.created_at;
  const mergedAt=item.pull_request?.merged_at||null;
  const state=mergedAt?'merged':(item.draft?'draft':(item.state==='closed'?'closed':'open'));
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository)||!Number.isInteger(number)||!title||!Number.isFinite(Date.parse(date)))throw new GitHubError('GitHub returned invalid activity.');
  return{number,repository,title,url,date,state,mergedAt};
 }).sort((first,second)=>Date.parse(second.date)-Date.parse(first.date));
 const seen=new Set();
 return{pulls:pulls.filter(pull=>{const key=pull.repository+'#'+pull.number;if(seen.has(key))return false;seen.add(key);return true;}),total:data.total_count,updatedAt:Date.now()};
}

function validCache(cache){
 return cache&&Number.isFinite(cache.updatedAt)&&cache.updatedAt<=Date.now()+60000&&Date.now()-cache.updatedAt<7*24*60*60*1000&&Number.isInteger(cache.total)&&Array.isArray(cache.commits)&&cache.commits.length<=6&&cache.commits.every(commit=>/^[\w.-]+\/[\w.-]+$/.test(commit.repository||'')&&/^[a-f0-9]{40}$/i.test(commit.sha||'')&&typeof commit.message==='string'&&commit.message.length<=240&&Number.isFinite(Date.parse(commit.date)));
}

function validPRCache(cache){
 return cache&&Number.isFinite(cache.updatedAt)&&cache.updatedAt<=Date.now()+60000&&Date.now()-cache.updatedAt<7*24*60*60*1000&&Number.isInteger(cache.total)&&Array.isArray(cache.pulls)&&cache.pulls.length<=6&&cache.pulls.every(pr=>/^[\w.-]+\/[\w.-]+$/.test(pr.repository||'')&&Number.isInteger(pr.number)&&typeof pr.title==='string'&&pr.title.length<=240&&typeof pr.url==='string'&&/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+$/.test(pr.url)&&['merged','open','closed','draft'].includes(pr.state)&&Number.isFinite(Date.parse(pr.date)));
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

 const pullList=document.getElementById('pull-list');
 const pullStatus=document.getElementById('pull-status');
 const pullMessage=document.getElementById('pulls-message');
 const refreshPullsButton=document.getElementById('refresh-pulls');

 let cache=null;
 let inFlight=false;
 let lastAttempt=0;
 let retryAt=0;

 let prCache=null;
 let prInFlight=false;
 let prLastAttempt=0;
 let prRetryAt=0;

 try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY));if(validCache(saved))cache=saved;}catch{}
 try{const savedPR=JSON.parse(localStorage.getItem(PR_CACHE_KEY));if(validPRCache(savedPR))prCache=savedPR;}catch{}

 function renderCommits(data){
  if(!list||!message)return;
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

 function renderPulls(data){
  if(!pullList||!pullMessage)return;
  const fragment=document.createDocumentFragment();
  data.pulls.forEach(pull=>{
   const item=document.createElement('li');item.className='commit-item pull-item';
   const badge=document.createElement('span');badge.className='pull-badge '+pull.state;badge.textContent=pull.state;badge.setAttribute('aria-label','Status: '+pull.state);
   const content=document.createElement('div');content.className='commit-content pull-content';
   const title=document.createElement('a');title.className='commit-title';title.href=pull.url;title.target='_blank';title.rel='noopener noreferrer';
   const titleText=document.createElement('bdi');titleText.dir='auto';titleText.textContent=pull.title||('Pull request #'+pull.number);title.appendChild(titleText);
   const meta=document.createElement('div');meta.className='commit-meta pull-meta';
   const repository=document.createElement('a');repository.href='https://github.com/'+pull.repository;repository.target='_blank';repository.rel='noopener noreferrer';repository.dir='ltr';repository.textContent=pull.repository;
   const num=document.createElement('bdi');num.dir='ltr';num.textContent='#'+pull.number;
   meta.append(repository,num);content.append(title,meta);
   const time=document.createElement('time');time.className='commit-time pull-time';time.dateTime=pull.date;time.dir='ltr';
   const cairoDate=new Date(pull.date).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' Cairo';
   time.title=(pull.mergedAt?('Merged '+new Date(pull.mergedAt).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' Cairo · '):'')+cairoDate;
   time.textContent=formatCommitAge(pull.date);
   item.append(badge,content,time);fragment.appendChild(item);
  });
  pullList.replaceChildren(fragment);
  pullMessage.hidden=data.pulls.length>0;
  pullMessage.textContent='No public pull requests found yet. New work will appear here automatically.';
 }

 if(cache&&list&&status&&message){renderCommits(cache);status.textContent='Saved activity';}
 if(prCache&&pullList&&pullStatus&&pullMessage){renderPulls(prCache);pullStatus.textContent='Saved activity';}

 async function refreshCommits(force=false){
  if(!list||!status||!message)return;
  if(inFlight)return;
  const now=Date.now();
  if(now<retryAt){status.textContent='Retry later';return;}
  if(now-lastAttempt<60000){status.textContent='Up to date';return;}
  if(!force&&cache&&now-cache.updatedAt<REFRESH_INTERVAL){status.textContent='Up to date';return;}
  inFlight=true;lastAttempt=now;if(refreshButton)refreshButton.disabled=true;list.setAttribute('aria-busy','true');status.textContent='Updating…';
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
  }finally{inFlight=false;if(refreshButton)refreshButton.disabled=false;list.setAttribute('aria-busy','false');}
 }

 async function refreshPulls(force=false){
  if(!pullList||!pullStatus||!pullMessage)return;
  if(prInFlight)return;
  const now=Date.now();
  if(now<prRetryAt){pullStatus.textContent='Retry later';return;}
  if(now-prLastAttempt<60000){pullStatus.textContent='Up to date';return;}
  if(!force&&prCache&&now-prCache.updatedAt<REFRESH_INTERVAL){pullStatus.textContent='Up to date';return;}
  prInFlight=true;prLastAttempt=now;if(refreshPullsButton)refreshPullsButton.disabled=true;pullList.setAttribute('aria-busy','true');pullStatus.textContent='Updating…';
  try{
   prCache=await fetchRecentPullRequests();renderPulls(prCache);
   try{localStorage.setItem(PR_CACHE_KEY,JSON.stringify(prCache));}catch{}
   pullStatus.textContent='Updated '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Cairo'}).format(new Date(prCache.updatedAt));
   pullStatus.title='Latest public pull requests indexed by GitHub. Search indexing can take a little time.';
  }catch(error){
   prRetryAt=Math.max(Date.now()+60000,error.retryAt||0);
   pullStatus.textContent=prCache?'Saved · offline':'Unavailable';
   pullMessage.hidden=false;
   pullMessage.textContent=prCache?'Showing saved pull requests from '+new Date(prCache.updatedAt).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' (Cairo). Refresh will retry automatically.':'Couldn’t load recent pull requests. Try Refresh in a minute, or explore them on GitHub below.';
  }finally{prInFlight=false;if(refreshPullsButton)refreshPullsButton.disabled=false;pullList.setAttribute('aria-busy','false');}
 }

 if(refreshButton)refreshButton.addEventListener('click',()=>refreshCommits(true));
 if(refreshPullsButton)refreshPullsButton.addEventListener('click',()=>refreshPulls(true));

 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
   if(cache)renderCommits(cache);
   refreshCommits();
   if(prCache)renderPulls(prCache);
   refreshPulls();
   loadContributions();
  }
 });

 setInterval(()=>{
  if(!document.hidden){
   if(cache)renderCommits(cache);
   refreshCommits();
   if(prCache)renderPulls(prCache);
   refreshPulls();
   loadContributions();
  }
 },REFRESH_INTERVAL);

 refreshCommits();
 refreshPulls();

 let contributionsInFlight=false;
 let lastContributionsFetch=0;

 async function loadContributions(force=false){
  if(contributionsInFlight)return;
  const now=Date.now();
  if(!force&&lastContributionsFetch&&now-lastContributionsFetch<REFRESH_INTERVAL)return;
  contributionsInFlight=true;
  try{
   const response=await fetch('https://github-contributions-api.jogruber.de/v4/'+USERNAME+'?y=last',{signal:AbortSignal.timeout(10000),credentials:'omit'});
   if(!response.ok)throw new Error('Unavailable');
   const data=await response.json();
   if(!Array.isArray(data.contributions))throw new Error('Invalid activity');
   const allRows=data.contributions.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.date)&&Number.isFinite(Date.parse(day.date))&&Number.isInteger(day.count)&&day.count>=0&&Number.isInteger(day.level)&&day.level>=0&&day.level<=4).sort((first,second)=>first.date.localeCompare(second.date));
   if(allRows.length<28||allRows.length>371||new Set(allRows.map(day=>day.date)).size!==allRows.length)throw new Error('Incomplete activity');
   const lastDay=new Date(allRows[allRows.length-1].date+'T00:00:00Z');
   const cutoffDate=new Date(Date.UTC(lastDay.getUTCFullYear(),lastDay.getUTCMonth()-8,lastDay.getUTCDate()));
   const cutoff=cutoffDate.toISOString().slice(0,10);
   const rows=allRows.filter(day=>day.date>=cutoff);
   const grid=document.getElementById('contribution-grid');
   if(!grid)return;
   const fragment=document.createDocumentFragment();
   const offset=new Date(rows[0].date+'T00:00:00Z').getUTCDay();
   for(let index=0;index<offset;index++){const space=document.createElement('span');space.style.visibility='hidden';fragment.appendChild(space);}
   rows.forEach(day=>{const cell=document.createElement('span');cell.className='contribution-cell';cell.dataset.level=day.level;cell.title=day.count+' contribution'+(day.count===1?'':'s')+' on '+day.date;fragment.appendChild(cell);});
   grid.replaceChildren(fragment);
   const total=rows.reduce((count,day)=>count+day.count,0);
   grid.setAttribute('aria-label',total.toLocaleString()+' GitHub contributions between '+rows[0].date+' and '+rows[rows.length-1].date+'; newest at right');
   const caption=document.getElementById('activity-caption');
   if(caption)caption.textContent=total.toLocaleString()+' contributions in the last 8 months · @'+USERNAME;
   const graph=document.getElementById('activity-graph');
   if(graph)graph.hidden=false;
   const fallback=document.getElementById('activity-fallback');
   if(fallback)fallback.hidden=true;
   lastContributionsFetch=Date.now();
  }catch{/* Keep repository links when activity is unavailable. */}
  finally{contributionsInFlight=false;}
 }
 loadContributions();
}

if(typeof document!=='undefined')initializeActivity();
