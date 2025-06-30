const m=acquireVsCodeApi();let r=null;function g(e={}){r=e.onRustAnalysisDone||(()=>{}),onGlobalContext=e.onGlobalContext||(()=>{}),onFuzzTargetsListed=e.onFuzzTargetsListed||(()=>{}),onCodeLensClicked=e.onCodeLensClicked||(()=>{}),window.addEventListener("message",n=>{const t=n.data;switch(t.command){case"globalContext":onGlobalContext&&onGlobalContext(t.context||{});break;case"rustAnalysisDone":s("Rust analysis completed successfully"),r&&r(t.results||[]);break;case"fuzzTargetsListed":onFuzzTargetsListed&&onFuzzTargetsListed(t.targets||[]);break;case"showFunctionInfo":onCodeLensClicked&&onCodeLensClicked(t);break;default:console.warn("Unhandled message from extension:",t);break}}),a({command:"getGlobaclContext"})}function a(e){m.postMessage(e)}function s(e){a({command:"log",message:e})}let l=null,u=null;const d=document.getElementById("entry-list"),f=document.getElementById("path-display-container");function p(e){const n=e.nextElementSibling;e.classList.toggle("expanded")?n.style.display="block":n.style.display="none"}const z=document.querySelectorAll(".collapsible-header");z.forEach(e=>{s("Setting up collapsible header:",e.textContent),e.addEventListener("click",()=>{s("Collapsible header clicked:",e.textContent),p(e)})});g({onFuzzTargetsListed:e=>{s("🧪 Fuzz targets listed:");const n=document.getElementById("harness-list");if(n.innerHTML="",e.length===0){n.innerHTML="<div>No fuzz targets found.</div>";return}for(const t of e){const o=document.createElement("div");o.className="function-button",o.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
          ${t.name}
        </div>
        <div>
          ${t.path.replace(u,"")}
        </div>
      `,o.onclick=()=>{a({command:"openFuzzTarget",filePath:t.path})},n.appendChild(o)}},onRustAnalysisDone:e=>{s("Rendering function results"),d.innerHTML="";for(const n of e){const t=document.createElement("div");t.className="function-button",t.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
          ${n.functionModulePath}::${n.functionName}
        </div>
        <div>
          ${n.functionLocation.filePath.replace(l,"")}
        </div>
      `,t.onclick=()=>{a({command:"openLocation",filePath:n.functionLocation.filePath,offset:n.functionLocation.offset})},d.appendChild(t)}},onGlobalContext:e=>{s("Global context received:",e.projectRoot);const n=e.projectRoot;n?(s("📦 Got Cargo project root: "+n),l=n,f.innerHTML=`Cargo Project Root: ${n}`):f.innerHTML="No Cargo project found.";const t=document.getElementById("fuzz-path-display"),o=e.fuzzRoot;if(o)s("🧪 Got Fuzz root: "+o),u=o,t.innerHTML=`Fuzz Root: ${o}`,s("Getting Fuzz targets: "),a({command:"getFuzzTargets",fuzzRoot:o});else{t.innerText="No Fuzz root found.";const i=document.createElement("button");i.textContent="Create a Root",i.addEventListener("click",()=>{a({command:"createFuzzRoot",target:l})}),t.appendChild(i)}if(e.results&&e.results.length>0){e.results,d.innerHTML="";for(const i of e.results){const c=document.createElement("div");c.className="function-button",c.innerHTML=`
        <div style="font-weight:bold; margin-bottom:4px;">
          ${i.functionModulePath}::${i.functionName}
        </div>
        <div>
          ${i.functionLocation.filePath.replace(l,"")}
        </div>
      `,c.onclick=()=>{a({command:"openLocation",filePath:i.functionLocation.filePath,offset:i.functionLocation.offset})},d.appendChild(c)}}},onCodeLensClicked:e=>{console.warn("How did you get here? Code lens frontend logic should be unused.")}});document.getElementById("start-analyzer").addEventListener("click",()=>{a({command:"runAnalyzer",target:"none",projectPath:l})});document.getElementById("test-vis").addEventListener("click",()=>{a({command:"testVisualization"})});
