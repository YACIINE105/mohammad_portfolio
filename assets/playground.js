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

 const canvas=document.getElementById('drawing-canvas');
 const context=canvas.getContext('2d');
 const colorInput=document.getElementById('ink-color');
 const modeLabel=document.getElementById('drawing-mode');
 const tools={pen:document.getElementById('draw-pen'),marker:document.getElementById('draw-marker'),eraser:document.getElementById('draw-eraser')};
 let selectedTool=null;
 let activeStroke=null;
 const strokes=[];
 function selectTool(tool){
  selectedTool=tool;
  canvas.classList.toggle('active',Boolean(tool));
  modeLabel.hidden=!tool;
  Object.entries(tools).forEach(([name,button])=>button.setAttribute('aria-pressed',String(name===tool)));
 }
 function renderStroke(stroke){
  context.save();
  context.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
  context.strokeStyle=stroke.color;
  context.fillStyle=stroke.color;
  context.globalAlpha=stroke.tool==='marker'?.3:1;
  context.lineWidth=stroke.tool==='eraser'?30:stroke.tool==='marker'?17:2.5;
  context.lineCap='round';context.lineJoin='round';
  context.beginPath();
  stroke.points.forEach((point,index)=>{if(index===0)context.moveTo(point.x,point.y);else context.lineTo(point.x,point.y);});
  if(stroke.points.length===1){context.arc(stroke.points[0].x,stroke.points[0].y,context.lineWidth/2,0,Math.PI*2);context.fill();}
  else context.stroke();
  context.restore();
 }
 function redraw(){context.clearRect(0,0,innerWidth,innerHeight);strokes.forEach(renderStroke);if(activeStroke)renderStroke(activeStroke);}
 function resizeCanvas(){const ratio=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*ratio;canvas.height=innerHeight*ratio;context.setTransform(ratio,0,0,ratio,0,0);redraw();}
 Object.entries(tools).forEach(([tool,button])=>button.addEventListener('click',()=>selectTool(selectedTool===tool?null:tool)));
 document.getElementById('draw-close').addEventListener('click',()=>selectTool(null));
 document.getElementById('draw-clear').addEventListener('click',()=>{strokes.length=0;activeStroke=null;redraw();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')selectTool(null);});
 canvas.addEventListener('pointerdown',event=>{
  if(!selectedTool||event.button!==0)return;
  activeStroke={tool:selectedTool,color:colorInput.value,points:[{x:event.clientX,y:event.clientY}]};
  canvas.setPointerCapture(event.pointerId);redraw();
 });
 canvas.addEventListener('pointermove',event=>{if(!activeStroke)return;activeStroke.points.push({x:event.clientX,y:event.clientY});redraw();});
 function finishStroke(){if(activeStroke){strokes.push(activeStroke);activeStroke=null;redraw();}}
 canvas.addEventListener('pointerup',finishStroke);
 canvas.addEventListener('pointercancel',finishStroke);
 addEventListener('resize',resizeCanvas);
 resizeCanvas();
})();
