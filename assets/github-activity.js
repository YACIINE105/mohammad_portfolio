const USERNAME='YACIINE105';
const REFRESH_INTERVAL=5*60*1000;
const CACHE_KEY='mohammad-github-commits-v1';
const EVENTS_CACHE_KEY='mohammad-github-events-v1';

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


function sanitizeText(str,maxLen=140){
 if(typeof str!=='string')return '';
 const clean=str.replace(/[#*`_~]/g,'').trim().split(/\r?\n/).find(line=>line.trim().length>0)||'';
 return clean.length>maxLen?clean.slice(0,maxLen-1)+'…':clean;
}

function safeGitHubUrl(url,fallback=null){
 if(typeof url==='string'){
  try{
   const parsed=new URL(url);
   if(parsed.protocol==='https:'&&parsed.hostname==='github.com')return parsed.href;
  }catch{}
 }
 return fallback;
}

export function mapGitHubEvent(event){
 if(!event||typeof event!=='object')return null;
 const type=typeof event.type==='string'?event.type:'UnknownEvent';
 const repo=typeof event.repo?.name==='string'&&/^[\w.-]+\/[\w.-]+$/.test(event.repo.name)?event.repo.name:'';
 const date=event.created_at;
 if(!Number.isFinite(Date.parse(date)))return null;
 const payload=event.payload||{};
 const repoUrl=repo?'https://github.com/'+repo:'https://github.com';

 let badge='activity';
 let badgeClass='generic';
 let title='';
 let url=repoUrl;
 let detail='';

 if(type==='IssueCommentEvent'){
  const isPr=Boolean(payload.issue?.pull_request);
  badge=isPr?'pr comment':'comment';
  badgeClass='comment';
  const num=payload.issue?.number;
  const body=sanitizeText(payload.comment?.body,140);
  const issueTitle=sanitizeText(payload.issue?.title,70);
  title=body||(num?(isPr?'Commented on PR #'+num:'Commented on #'+num):'Commented on GitHub');
  const commentUrl=safeGitHubUrl(payload.comment?.html_url,null);
  const fallbackUrl=num?repoUrl+'/'+(isPr?'pull':'issues')+'/'+num:repoUrl;
  url=commentUrl||fallbackUrl;
  detail=num?(isPr?'PR #':'Issue #')+num+(issueTitle?' · '+issueTitle:''):repo;
 }else if(type==='PullRequestReviewCommentEvent'){
  badge='review comment';
  badgeClass='review';
  const num=payload.pull_request?.number;
  const body=sanitizeText(payload.comment?.body,140);
  title=body||'Review comment on PR #'+num;
  const commentUrl=safeGitHubUrl(payload.comment?.html_url,null);
  url=commentUrl||(num?repoUrl+'/pull/'+num:repoUrl);
  detail=num?'PR #'+num:repo;
 }else if(type==='PullRequestReviewEvent'){
  badge='review';
  badgeClass='review';
  const num=payload.pull_request?.number;
  const state=payload.review?.state?.toLowerCase()||'submitted';
  const prTitle=sanitizeText(payload.pull_request?.title,70);
  title='Review ('+state+') on PR #'+num;
  url=safeGitHubUrl(payload.review?.html_url,num?repoUrl+'/pull/'+num:repoUrl);
  detail=num?'PR #'+num+(prTitle?' · '+prTitle:''):repo;
 }else if(type==='PullRequestEvent'){
  const action=payload.action||'opened';
  const merged=payload.pull_request?.merged||action==='merged';
  badge=merged?'merged':(action==='closed'?'closed':action);
  badgeClass=merged?'merged':(action==='closed'?'closed':'pr');
  const num=payload.pull_request?.number||payload.number;
  const prTitle=sanitizeText(payload.pull_request?.title,140);
  title=prTitle||(num?'Pull request #'+num:'Pull request');
  url=safeGitHubUrl(payload.pull_request?.html_url,num?repoUrl+'/pull/'+num:repoUrl);
  detail=num?'PR #'+num+' · '+badge:repo;
 }else if(type==='PushEvent'){
  badge='push';
  badgeClass='push';
  const branch=(payload.ref||'').replace(/^refs\/heads\//,'');
  const headSha=payload.head?payload.head.slice(0,7):'';
  title=branch?'Pushed to '+branch:'Pushed commits';
  url=headSha&&repo?repoUrl+'/commit/'+payload.head:repoUrl;
  detail=headSha?'commit '+headSha:(branch||'push');
 }else if(type==='WatchEvent'){
  badge='star';
  badgeClass='star';
  title='Starred '+(repo||'repository');
  url=repoUrl;
  detail='starred repo';
 }else if(type==='IssuesEvent'){
  const action=payload.action||'opened';
  badge=action;
  badgeClass='issue';
  const num=payload.issue?.number;
  const issueTitle=sanitizeText(payload.issue?.title,140);
  title=issueTitle||(num?'Issue #'+num:'Issue');
  url=safeGitHubUrl(payload.issue?.html_url,num?repoUrl+'/issues/'+num:repoUrl);
  detail=num?'Issue #'+num+' · '+action:repo;
 }else if(type==='CreateEvent'){
  const refType=payload.ref_type||'ref';
  badge='create';
  badgeClass='create';
  const ref=payload.ref||'';
  title=ref?'Created '+refType+' '+ref:'Created '+refType;
  url=ref&&refType==='branch'?repoUrl+'/tree/'+ref:repoUrl;
  detail=refType+' · '+repo;
 }else if(type==='ForkEvent'){
  badge='fork';
  badgeClass='fork';
  title='Forked '+(repo||'repository');
  url=safeGitHubUrl(payload.forkee?.html_url,repoUrl);
  detail=payload.forkee?.full_name||'fork';
 }else if(type==='MemberEvent'){
  badge='member';
  badgeClass='member';
  title=(payload.action||'Collaborator')+' on '+repo;
  url=repoUrl;
  detail=repo;
 }else{
  badge=type.replace(/Event$/,'').toLowerCase()||'activity';
  badgeClass='generic';
  title='Public activity on '+(repo||'GitHub');
  url=repoUrl;
  detail=type.replace(/Event$/,'');
 }

 return{id:String(event.id||''),type,badge,badgeClass,title,url,repository:repo,date,detail};
}

export async function fetchRecentEvents({apiBase='https://api.github.com',username=USERNAME,signal}={}){
 const url=new URL(apiBase.replace(/\/$/,'')+'/users/'+encodeURIComponent(username)+'/events/public');
 url.search=new URLSearchParams({per_page:'100'});
 const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',signal:signal||AbortSignal.timeout(10000)});
 if(!response.ok){
  const reset=Number(response.headers.get('x-ratelimit-reset'))*1000;
  const retryAfter=response.headers.get('retry-after');
  const retrySeconds=Number(retryAfter);
  const retryAt=retryAfter?(Number.isFinite(retrySeconds)?Date.now()+retrySeconds*1000:Date.parse(retryAfter)):reset;
  throw new GitHubError(response.status===403||response.status===429?'GitHub is taking a breather. Please try again later.':'GitHub is temporarily unavailable.',Number.isFinite(retryAt)?retryAt:Date.now()+60000);
 }
 const data=await response.json();
 if(!Array.isArray(data))throw new GitHubError('GitHub returned invalid activity.');
 const events=[];
 for(const item of data){
  const mapped=mapGitHubEvent(item);
  if(mapped)events.push(mapped);
 }
 events.sort((first,second)=>Date.parse(second.date)-Date.parse(first.date));
 return{events:events.slice(0,6),total:data.length,updatedAt:Date.now()};
}

function validEventsCache(cache){
 return cache&&Number.isFinite(cache.updatedAt)&&cache.updatedAt<=Date.now()+60000&&Date.now()-cache.updatedAt<7*24*60*60*1000&&Number.isInteger(cache.total)&&Array.isArray(cache.events)&&cache.events.length<=10&&cache.events.every(ev=>/^[\w.-]+\/[\w.-]+$/.test(ev.repository||'')&&typeof ev.title==='string'&&ev.title.length<=240&&typeof ev.url==='string'&&/^https:\/\/github\.com\//.test(ev.url)&&typeof ev.badge==='string'&&Number.isFinite(Date.parse(ev.date)));
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


 const interactionList=document.getElementById('interaction-list');
 const interactionStatus=document.getElementById('interaction-status');
 const interactionMessage=document.getElementById('interactions-message');
 const refreshInteractionsButton=document.getElementById('refresh-interactions');

 let cache=null;
 let inFlight=false;
 let lastAttempt=0;
 let retryAt=0;


 let eventsCache=null;
 let eventsInFlight=false;
 let eventsLastAttempt=0;
 let eventsRetryAt=0;

 try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY));if(validCache(saved))cache=saved;}catch{}
 try{const savedEvents=JSON.parse(localStorage.getItem(EVENTS_CACHE_KEY));if(validEventsCache(savedEvents))eventsCache=savedEvents;}catch{}

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

 function renderInteractions(data){
  if(!interactionList||!interactionMessage)return;
  const fragment=document.createDocumentFragment();
  data.events.forEach(item=>{
   const li=document.createElement('li');li.className='commit-item interaction-item';
   const badge=document.createElement('span');badge.className='interaction-badge '+(item.badgeClass||'generic');badge.textContent=item.badge;badge.setAttribute('aria-label','Type: '+item.badge);
   const content=document.createElement('div');content.className='commit-content interaction-content';
   const title=document.createElement('a');title.className='commit-title';title.href=item.url;title.target='_blank';title.rel='noopener noreferrer';
   const titleText=document.createElement('bdi');titleText.dir='auto';titleText.textContent=item.title||'Public activity';title.appendChild(titleText);
   const meta=document.createElement('div');meta.className='commit-meta interaction-meta';
   const repository=document.createElement('a');repository.href='https://github.com/'+item.repository;repository.target='_blank';repository.rel='noopener noreferrer';repository.dir='ltr';repository.textContent=item.repository;
   const detail=document.createElement('bdi');detail.dir='ltr';detail.textContent=item.detail||item.repository;
   meta.append(repository,detail);content.append(title,meta);
   const time=document.createElement('time');time.className='commit-time interaction-time';time.dateTime=item.date;time.dir='ltr';
   time.title=new Date(item.date).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' Cairo';
   time.textContent=formatCommitAge(item.date);
   li.append(badge,content,time);fragment.appendChild(li);
  });
  interactionList.replaceChildren(fragment);
  interactionMessage.hidden=data.events.length>0;
  interactionMessage.textContent='No recent public interactions found yet. New work will appear here automatically.';
 }

 if(cache&&list&&status&&message){renderCommits(cache);status.textContent='Saved activity';}
 if(eventsCache&&interactionList&&interactionStatus&&interactionMessage){renderInteractions(eventsCache);interactionStatus.textContent='Saved activity';}

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

 async function refreshInteractions(force=false){
  if(!interactionList||!interactionStatus||!interactionMessage)return;
  if(eventsInFlight)return;
  const now=Date.now();
  if(now<eventsRetryAt){interactionStatus.textContent='Retry later';return;}
  if(now-eventsLastAttempt<60000){interactionStatus.textContent='Up to date';return;}
  if(!force&&eventsCache&&now-eventsCache.updatedAt<REFRESH_INTERVAL){interactionStatus.textContent='Up to date';return;}
  eventsInFlight=true;eventsLastAttempt=now;if(refreshInteractionsButton)refreshInteractionsButton.disabled=true;interactionList.setAttribute('aria-busy','true');interactionStatus.textContent='Updating…';
  try{
   eventsCache=await fetchRecentEvents();renderInteractions(eventsCache);
   try{localStorage.setItem(EVENTS_CACHE_KEY,JSON.stringify(eventsCache));}catch{}
   interactionStatus.textContent='Updated '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Cairo'}).format(new Date(eventsCache.updatedAt));
   interactionStatus.title='Latest public GitHub interactions (comments, PRs, pushes, reviews). Events are indexed by GitHub within 30s to 6 hours.';
  }catch(error){
   eventsRetryAt=Math.max(Date.now()+60000,error.retryAt||0);
   interactionStatus.textContent=eventsCache?'Saved · offline':'Unavailable';
   interactionMessage.hidden=false;
   interactionMessage.textContent=eventsCache?'Showing saved interactions from '+new Date(eventsCache.updatedAt).toLocaleString('en-GB',{timeZone:'Africa/Cairo'})+' (Cairo). Refresh will retry automatically.':'Couldn’t load recent interactions. Try Refresh in a minute, or explore them on GitHub below.';
  }finally{eventsInFlight=false;if(refreshInteractionsButton)refreshInteractionsButton.disabled=false;interactionList.setAttribute('aria-busy','false');}
 }

 if(refreshButton)refreshButton.addEventListener('click',()=>refreshCommits(true));
 if(refreshInteractionsButton)refreshInteractionsButton.addEventListener('click',()=>refreshInteractions(true));

 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
   if(cache)renderCommits(cache);
   refreshCommits();
   if(eventsCache)renderInteractions(eventsCache);
   refreshInteractions();
   loadContributions();
  }
 });

 setInterval(()=>{
  if(!document.hidden){
   if(cache)renderCommits(cache);
   refreshCommits();
   if(eventsCache)renderInteractions(eventsCache);
   refreshInteractions();
   loadContributions();
  }
 },REFRESH_INTERVAL);

 refreshCommits();
 refreshInteractions();

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
   const cutoffDate=new Date(Date.UTC(lastDay.getUTCFullYear(),lastDay.getUTCMonth()-12,lastDay.getUTCDate()));
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
   if(caption)caption.textContent=total.toLocaleString()+' contributions in the last 12 months · @'+USERNAME;
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
