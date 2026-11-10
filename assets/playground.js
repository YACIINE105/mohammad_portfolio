(() => {
 'use strict';
 const workbench=document.getElementById('workbench');
 const workButton=document.getElementById('show-work');
 const mascot=document.getElementById('buddy-mascot');
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 function revealWork(projectIndex){
  workbench.open=true;
  document.getElementById('tab-projects').click();
  let target=workbench;
  if(projectIndex!==undefined){target=document.querySelectorAll('.project')[projectIndex];target.open=true;}
  target.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'});
  if(projectIndex!==undefined)target.querySelector('summary').focus({preventScroll:true});
 }
 workButton.addEventListener('click',()=>revealWork());
 workbench.addEventListener('toggle',()=>workButton.setAttribute('aria-expanded',String(workbench.open)));
 document.querySelectorAll('[data-project]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();revealWork(Number(link.dataset.project));}));
 const noteButton=document.getElementById('fold-note');
 const hangingNote=document.querySelector('.hanging-note');
 const contactDialog=document.getElementById('contact-dialog');
 const noteLabel=noteButton.textContent;
 const pullThreshold=56;
 let noteDrag=null;
 let suppressNoteClick=false;
 let noteClickTimer;
 let openedFromNote=false;
 function openNote(){
  if(contactDialog.open)return;
  openedFromNote=true;
  document.getElementById('open-contact').click();
  document.getElementById('note-message').focus({preventScroll:true});
 }
 function setNotePull(distance){
  hangingNote.style.setProperty('--note-pull-distance',distance+'px');
  hangingNote.classList.toggle('is-armed',distance>=pullThreshold);
  noteButton.textContent=distance>=pullThreshold?'Release to write':noteLabel;
 }
 function finishNotePull(event,cancelled=false){
  if(!noteDrag||(event&&event.pointerId!==noteDrag.pointerId))return;
  const completedDrag=noteDrag;
  noteDrag=null;
  suppressNoteClick=completedDrag.moved;
  clearTimeout(noteClickTimer);
  noteClickTimer=setTimeout(()=>{suppressNoteClick=false;},0);
  hangingNote.classList.remove('is-pulling');
  setNotePull(0);
  if(noteButton.hasPointerCapture(completedDrag.pointerId))noteButton.releasePointerCapture(completedDrag.pointerId);
  if(!cancelled&&completedDrag.distance>=pullThreshold)openNote();
 }
 noteButton.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||contactDialog.open)return;
  clearTimeout(noteClickTimer);
  suppressNoteClick=false;
  noteDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,distance:0,moved:false};
  hangingNote.classList.add('is-pulling');
  noteButton.setPointerCapture(event.pointerId);
 });
 noteButton.addEventListener('pointermove',event=>{
  if(!noteDrag||event.pointerId!==noteDrag.pointerId)return;
  const verticalDistance=event.clientY-noteDrag.startY;
  const downwardDistance=Math.max(0,verticalDistance);
  noteDrag.moved=noteDrag.moved||Math.hypot(event.clientX-noteDrag.startX,verticalDistance)>6;
  noteDrag.distance=Math.min(144,Math.min(downwardDistance,96)+Math.max(0,downwardDistance-96)*.18);
  setNotePull(noteDrag.distance);
  event.preventDefault();
 });
 noteButton.addEventListener('pointerup',event=>finishNotePull(event));
 noteButton.addEventListener('pointercancel',event=>finishNotePull(event,true));
 noteButton.addEventListener('lostpointercapture',event=>finishNotePull(event,true));
 addEventListener('blur',()=>finishNotePull(null,true));
 noteButton.addEventListener('keydown',event=>{if(event.key==='Escape')finishNotePull(null,true);});
 noteButton.addEventListener('click',event=>{
  if(suppressNoteClick&&event.detail!==0){event.preventDefault();return;}
  openNote();
 });
 contactDialog.addEventListener('close',()=>{if(openedFromNote){openedFromNote=false;noteButton.focus({preventScroll:true});}});
 document.getElementById('note-form').addEventListener('submit',event=>{
  event.preventDefault();
  const message=document.getElementById('note-message').value.trim();
  if(!message)return;
  const subject=encodeURIComponent('A note from your portfolio');
  location.href='mailto:mohammad.a.hammad.eng@gmail.com?subject='+subject+'&body='+encodeURIComponent(message);
 });
 let paused=reducedMotion.matches;
 const buddyTracker=document.querySelector('.buddy-tracker');
 const buddyPosition={eyeX:0,eyeY:0};
 const buddyTarget={eyeX:0,eyeY:0};
 let buddyFrame=null;
 function renderBuddy(){
  Object.entries(buddyPosition).forEach(([name,value])=>mascot.style.setProperty('--buddy-'+name,value+'px'));
 }
 function followBuddy(){
  buddyFrame=null;
  if(paused||reducedMotion.matches)return;
  let unsettled=false;
  Object.keys(buddyPosition).forEach(name=>{
   const difference=buddyTarget[name]-buddyPosition[name];
   buddyPosition[name]=Math.abs(difference)<.02?buddyTarget[name]:buddyPosition[name]+difference*.18;
   if(Math.abs(difference)>=.02)unsettled=true;
  });
  renderBuddy();
  if(unsettled)buddyFrame=requestAnimationFrame(followBuddy);
 }
 function wakeBuddy(){if(buddyTracker&&!paused&&!reducedMotion.matches&&buddyFrame===null)buddyFrame=requestAnimationFrame(followBuddy);}
 function centerBuddy(immediate=false){
  Object.keys(buddyTarget).forEach(name=>{buddyTarget[name]=0;});
  if(immediate){
   if(buddyFrame!==null)cancelAnimationFrame(buddyFrame);
   buddyFrame=null;
   Object.keys(buddyPosition).forEach(name=>{buddyPosition[name]=0;});
   renderBuddy();
  }else wakeBuddy();
 }
 function updateMotion(){
  document.body.classList.toggle('paused',paused);
  if(paused&&buddyFrame!==null){cancelAnimationFrame(buddyFrame);buddyFrame=null;}
  if(!paused)wakeBuddy();
 }
 updateMotion();
 document.addEventListener('pointermove',event=>{
  if(!buddyTracker||paused||reducedMotion.matches||event.pointerType==='touch')return;
  const bounds=mascot.getBoundingClientRect();
  if(bounds.bottom<0||bounds.top>innerHeight)return;
  const horizontalDirection=Math.tanh((event.clientX-bounds.left-bounds.width/2)/180);
  const verticalDirection=Math.tanh((event.clientY-bounds.top-bounds.height/2)/180);
  buddyTarget.eyeX=horizontalDirection*2.5;
  buddyTarget.eyeY=verticalDirection*2;
  wakeBuddy();
 },{passive:true});
 document.addEventListener('pointerleave',()=>centerBuddy());
 addEventListener('blur',()=>centerBuddy());
 addEventListener('scroll',()=>centerBuddy(),{passive:true});
 reducedMotion.addEventListener('change',()=>{paused=reducedMotion.matches;if(paused)centerBuddy(true);updateMotion();});
})();
