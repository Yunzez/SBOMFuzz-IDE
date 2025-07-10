const k=acquireVsCodeApi();let v=null;function F(e={}){v=e.onRustAnalysisDone||(()=>{}),onGlobalContext=e.onGlobalContext||(()=>{}),onFuzzTargetsListed=e.onFuzzTargetsListed||(()=>{}),window.addEventListener("message",o=>{const n=o.data;switch(n.command){case"globalContext":onGlobalContext&&onGlobalContext(n.context||{});break;case"rustAnalysisDone":s("Rust analysis completed successfully"),v&&v(n.results||[]);break;case"fuzzTargetsListed":onFuzzTargetsListed&&onFuzzTargetsListed(n.targets||[]);break;case"refreshHarnessList":onFuzzTargetsListed&&onFuzzTargetsListed(n.targets||[]);default:console.warn("Unhandled message from extension:",n);break}}),r({command:"getGlobaclContext"})}function r(e){k.postMessage(e)}function s(e){r({command:"log",message:e})}let p=null,b=null,h=null;const y=document.getElementById("entry-list"),E=document.getElementById("path-display-container");function f(e,o){var i;o.innerHTML="";const n=e.filter(t=>t.status!=="Ignore"),a=e.filter(t=>t.status==="Ignore");n.sort((t,c)=>c.priorityScore-t.priorityScore),e=[...n,...a];for(const t of e){s(`status: ${t.status}`);const d=`<span class="status-badge" style="background:${{New:"gray",Ignore:"darkred",HarnessGenerated:"green"}[t.status]||"black"};">${t.status}</span>`,m=document.createElement("button");m.textContent="Ignore",m.className="negative-button";const u=document.createElement("button");u.textContent="Generate Harness",u.className="affirmative-button",u.style.marginLeft="4px";const l=document.createElement("div");l.className="function-button",l.innerHTML=`
      <div style="font-weight:bold; margin-bottom:4px; display: flex; gap: 2px; flex-wrap: wrap; align-items: center;">
      <span>${t.functionModulePath}::${t.functionName}</span>
    ${d}
      </div>
      <div>${(i=t.functionLocation)==null?void 0:i.filePath.replace(p,"")}</div>
      <div class="priority-score" style="margin-top: 4px;">
      Priority Score: ${t.priorityScore.toFixed(3)}
      <span 
      class="info-icon" 
      style="margin-left: 4px; cursor: pointer;" 
      title="Hover to see score breakdown">ℹ️</span>
      </div>
      <div class="btns-div" style="margin-top:6px;"></div>
      `;const z=l.getElementsByClassName("priority-score")[0];z.style.position="relative";const g=document.createElement("div");g.className="score-breakdown",g.innerHTML=`
    <strong>Score Breakdown:</strong>
    <div style="margin: 0; padding-left: 16px;">
    <div>Param Count: ${t.paramCount.toFixed(1)}</div>
    <div>Function Usage: ${t.usageCount.toFixed(1)}</div>
    <div>Centrality Score: ${t.centralityScore.toFixed(5)}</div>
    <div>Unsafe Score: ${t.unsafeScore.toFixed(1)}</div>
    </div>
  `,z.appendChild(g);const C=z.querySelector(".info-icon");C.addEventListener("mouseenter",()=>{g.style.display="block"}),C.addEventListener("mouseleave",()=>{g.style.display="none"});const L=l.getElementsByClassName("btns-div")[0];L.appendChild(m),L.appendChild(u),m.onclick=x=>{x.stopPropagation(),t.status="Ignore",s(`ignore, ${t.status}`),f(e,o)},u.onclick=x=>{s("generate"),r({command:"generateHarness",fuzzRoot:b,target:t}),t.status="HarnessGenerated",f(e,o)},l.onclick=()=>{r({command:"openLocation",filePath:t.functionLocation.filePath,offset:t.functionLocation.offset})},o.appendChild(l)}}function T(e){const o=e.nextElementSibling;e.classList.toggle("expanded")?o.style.display="block":o.style.display="none"}const R=document.querySelectorAll(".collapsible-header");R.forEach(e=>{s("Setting up collapsible header:",e.textContent),e.addEventListener("click",()=>{s("Collapsible header clicked:",e.textContent),T(e)})});F({onFuzzTargetsListed:e=>{s("🧪 Fuzz targets listed:");const o=document.getElementById("harness-list");if(o.innerHTML="",e.length===0){o.innerHTML="<div>No fuzz targets found.</div>";return}for(const n of e){const a=document.createElement("div"),i=document.createElement("button");i.textContent="Run",i.className="affirmative-button";const t=document.createElement("button");t.textContent="Delete",t.className="negative-button",t.style.marginLeft="4px",a.className="function-button",a.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
          ${n.name}
        </div>
        <div>
          ${n.path.replace(b,"")}
        </div>
          <div class="btns-div" style="margin-top:6px;"></div>
      `,a.onclick=()=>{r({command:"openLocation",filePath:n.path,offset:0})};const c=a.getElementsByClassName("btns-div")[0];c.appendChild(i),c.appendChild(t),t.onclick=d=>{d.stopPropagation(),s(`Deleting fuzz target: ${n.name}`),r({command:"deleteFuzzTarget",target:n.name})},i.onclick=d=>{d.stopPropagation(),s(`Running fuzz target: ${n.name}`),r({command:"runFuzzTarget",target:n.name})},o.appendChild(a)}},onRustAnalysisDone:e=>{s("Rendering function results"),y.innerHTML="",f(e,y)},onGlobalContext:e=>{s("Global context received:",e.projectRoot);const o=e.projectRoot;o?(s("📦 Got Cargo project root: "+o),p=o,E.innerHTML=`Cargo Project Root: ${o}`):E.innerHTML="No Cargo project found.";const n=document.getElementById("fuzz-path-display"),a=e.fuzzRoot;if(a)s("🧪 Got Fuzz root: "+a),b=a,n.innerHTML=`Fuzz Harness Root: ${a}`,s("Getting Fuzz targets: "),r({command:"getFuzzTargets",fuzzRoot:a});else{n.innerText="No Fuzz root found.";const i=document.createElement("button");i.textContent="Create a Root",i.addEventListener("click",()=>{r({command:"createFuzzRoot",target:p})}),n.appendChild(i)}e.results&&e.results.length>0&&(h=e.results,f(h,y))}});document.getElementById("start-analyzer").addEventListener("click",()=>{r({command:"runAnalyzer",target:"none",projectPath:p})});document.getElementById("test-vis").addEventListener("click",()=>{r({command:"testVisualization"})});
