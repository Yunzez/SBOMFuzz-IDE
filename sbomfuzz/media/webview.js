const b=acquireVsCodeApi();let g=null;function v(t={}){g=t.onRustAnalysisDone||(()=>{}),onGlobalContext=t.onGlobalContext||(()=>{}),onFuzzTargetsListed=t.onFuzzTargetsListed||(()=>{}),window.addEventListener("message",n=>{const e=n.data;switch(e.command){case"globalContext":onGlobalContext&&onGlobalContext(e.context||{});break;case"rustAnalysisDone":s("Rust analysis completed successfully"),g&&g(e.results||[]);break;case"fuzzTargetsListed":onFuzzTargetsListed&&onFuzzTargetsListed(e.targets||[]);break;default:console.warn("Unhandled message from extension:",e);break}}),i({command:"getGlobaclContext"})}function i(t){b.postMessage(t)}function s(t){i({command:"log",message:t})}let r=null,p=null;const d=document.getElementById("entry-list"),z=document.getElementById("path-display-container");function y(t){const n=t.nextElementSibling;t.classList.toggle("expanded")?n.style.display="block":n.style.display="none"}const L=document.querySelectorAll(".collapsible-header");L.forEach(t=>{s("Setting up collapsible header:",t.textContent),t.addEventListener("click",()=>{s("Collapsible header clicked:",t.textContent),y(t)})});v({onFuzzTargetsListed:t=>{s("🧪 Fuzz targets listed:");const n=document.getElementById("harness-list");if(n.innerHTML="",t.length===0){n.innerHTML="<div>No fuzz targets found.</div>";return}for(const e of t){const o=document.createElement("div");o.className="function-button",o.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
          ${e.name}
        </div>
        <div>
          ${e.path.replace(p,"")}
        </div>
      `,o.onclick=()=>{i({command:"openLocation",filePath:e.path,offset:0})},n.appendChild(o)}},onRustAnalysisDone:t=>{var n;s("Rendering function results"),d.innerHTML="",t=t.sort((e,o)=>o.priorityScore-e.priorityScore);for(const e of t){const a=`<span class="status-badge" style="background:${{Default:"gray",Ignore:"darkred",GenerateHarness:"darkblue",HarnessGenerated:"green"}[e.status]||"black"};">${e.status}</span>`,l=document.createElement("button");l.textContent="Ignore";const u=document.createElement("button");u.textContent="Generate Harness";const c=document.createElement("div");c.className="function-button",c.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
      ${e.functionModulePath}::${e.functionName} ${a}
        </div>
        <div>${(n=e.functionLocation)==null?void 0:n.filePath.replace(r,"")}</div>
        <div>Priority Score: ${e.priorityScore.toFixed(3)}</div>
        <div class="btns-div" style="margin-top:6px;"></div>
      `;const m=c.getElementsByClassName("btns-div")[0];m.appendChild(l),m.appendChild(u),l.onclick=f=>{f.stopPropagation(),s("ignore")},u.onclick=f=>{f.stopPropagation(),s("generate")},c.onclick=()=>{i({command:"openLocation",filePath:e.functionLocation.filePath,offset:e.functionLocation.offset})},d.appendChild(c)}},onGlobalContext:t=>{s("Global context received:",t.projectRoot);const n=t.projectRoot;n?(s("📦 Got Cargo project root: "+n),r=n,z.innerHTML=`Cargo Project Root: ${n}`):z.innerHTML="No Cargo project found.";const e=document.getElementById("fuzz-path-display"),o=t.fuzzRoot;if(o)s("🧪 Got Fuzz root: "+o),p=o,e.innerHTML=`Fuzz Root: ${o}`,s("Getting Fuzz targets: "),i({command:"getFuzzTargets",fuzzRoot:o});else{e.innerText="No Fuzz root found.";const a=document.createElement("button");a.textContent="Create a Root",a.addEventListener("click",()=>{i({command:"createFuzzRoot",target:r})}),e.appendChild(a)}if(t.results&&t.results.length>0){t.results,d.innerHTML="";for(const a of t.results){const l=document.createElement("div");l.className="function-button",l.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
          ${a.functionModulePath}::${a.functionName}
        </div>
        <div>
          ${a.functionLocation.filePath.replace(r,"")}
        </div>
      `,l.onclick=()=>{i({command:"openLocation",filePath:a.functionLocation.filePath,offset:a.functionLocation.offset})},d.appendChild(l)}}}});document.getElementById("start-analyzer").addEventListener("click",()=>{i({command:"runAnalyzer",target:"none",projectPath:r})});document.getElementById("test-vis").addEventListener("click",()=>{i({command:"testVisualization"})});
