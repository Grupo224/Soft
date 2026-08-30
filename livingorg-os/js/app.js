/* ============================================================================
   LIVINGORG OS — MOTOR (app.js)  ·  Rediseño con identidad Grupo Altoplano
   ----------------------------------------------------------------------------
   Lee la configuración de config.js y genera toda la interfaz. No cambia tu
   información: mismos objetos, campos y datos semilla. Solo eleva la
   experiencia (marca Altoplano, mapa de ejecución, curvas de nivel, etc.).
   ============================================================================ */
(function () {
  "use strict";
  const LO = window.LO;

  /* === 1. ICONOS (SVG en línea) =========================================== */
  const P = {
    home:"M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
    org:"M12 3v4M6 21v-4M18 21v-4M6 17h12M12 7v10M4 21h4M10 21h4M16 21h4M9 5h6v2H9z",
    process:"M4 6h6v4H4zM14 14h6v4h-6zM7 10v4h10M7 14v0",
    sop:"M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6",
    agent:"M12 3a4 4 0 014 4v1h1a2 2 0 012 2v2a5 5 0 01-5 5H9a5 5 0 01-5-5V10a2 2 0 012-2h1V7a4 4 0 014-4zM9 12h.01M15 12h.01",
    prompt:"M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
    knowledge:"M4 5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2zM8 8h4M8 12h8M8 16h8",
    run:"M6 4l14 8-14 8z",
    task:"M4 5h16v14H4zM8 10l2 2 4-4M8 15h6",
    approval:"M4 4h16v12H4zM9 10l2 2 4-4M8 20h8",
    plug:"M9 3v5M15 3v5M7 8h10v3a5 5 0 01-10 0zM12 16v5",
    chart:"M4 20V4M4 20h16M8 20v-6M13 20V9M18 20v-9",
    shield:"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
    search:"M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-3.5-3.5",
    plus:"M12 5v14M5 12h14",
    close:"M6 6l12 12M18 6L6 18",
    edit:"M4 20h4L18 10l-4-4L4 16zM14 6l4 4",
    trash:"M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13",
    download:"M12 4v11M8 11l4 4 4-4M5 20h14",
    upload:"M12 20V9M8 13l4-4 4 4M5 4h14",
    check:"M5 12l5 5L20 6",
    checkCircle:"M12 4a8 8 0 100 16 8 8 0 000-16zM8.5 12l2.5 2.5 4.5-5",
    chevron:"M9 6l6 6-6 6",
    chevL:"M15 6l-6 6 6 6",
    chevD:"M6 9l6 6 6-6",
    grid:"M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    list:"M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
    zin:"M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4M11 8v6M8 11h6",
    zout:"M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4M8 11h6",
    fit:"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    sparkle:"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
    alert:"M12 4l9 16H3zM12 10v5M12 18h.01",
    clock:"M12 4a8 8 0 100 16 8 8 0 000-16zM12 8v4l3 2",
    link:"M9 15l6-6M8 12l-2 2a3 3 0 004 4l2-2M16 12l2-2a3 3 0 00-4-4l-2 2",
    dept:"M4 21V6l8-3 8 3v15M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01",
    role:"M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.7.9-5.5-4-3.9 5.5-.8z",
    person:"M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0",
    user:"M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0",
    users:"M8.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20a5.5 5.5 0 0111 0M16 4.5a3.5 3.5 0 010 6.8M21 20a5.5 5.5 0 00-3.5-5.1",
    dots:"M6 12h.01M12 12h.01M18 12h.01",
    filter:"M4 5h16l-6 8v5l-4 2v-7z",
    doc:"M7 3h7l5 5v13H7zM14 3v5h5",
    activity:"M3 12h4l2.5 7 5-16 2.5 9H21",
    layers:"M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
    bell:"M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2.4 2.4 0 004 0",
    calendar:"M5 5h14v15H5zM5 9h14M9 3v4M15 3v4",
    folder:"M4 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z",
    target:"M12 4a8 8 0 100 16 8 8 0 000-16zM12 8a4 4 0 100 8 4 4 0 000-8zM12 11.5a.5.5 0 100 1 .5.5 0 000-1",
    zap:"M13 2L4 14h7l-1 8 9-12h-7z",
    dollar:"M12 3v18M8.5 17a3 3 0 003 3h1a3 3 0 000-6h-1a3 3 0 010-6h1a3 3 0 013 3",
    sun:"M12 7a5 5 0 100 10 5 5 0 000-10zM12 2v2M12 20v2M4 12H2M22 12h-2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4",
    move:"M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3",
    reset:"M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006 6M4 15a8 8 0 0014 3",
    settings:"M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h1M19 12h1M12 4v1M12 19v1M6 6l.7.7M17.3 17.3l.7.7M18 6l-.7.7M6.7 17.3l-.7.7",
    logout:"M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3M16 12H9M14 8l4 4-4 4",
    moon:"M20 14a8 8 0 11-9.8-9.8A6.5 6.5 0 0020 14z",
    palette:"M12 3a9 9 0 100 18c1.4 0 2-1 2-2 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H17a4 4 0 004-4c0-4.4-4-8-9-8zM7.5 12a1 1 0 100-2 1 1 0 000 2zM10.5 8a1 1 0 100-2 1 1 0 000 2zM15 8a1 1 0 100-2 1 1 0 000 2z",
  };
  function icon(name, cls){
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 24 24"); svg.setAttribute("fill","none");
    svg.setAttribute("stroke","currentColor"); svg.setAttribute("stroke-width","1.7");
    svg.setAttribute("stroke-linecap","round"); svg.setAttribute("stroke-linejoin","round");
    svg.setAttribute("class","ico "+(cls||"")); svg.setAttribute("aria-hidden","true");
    (P[name]||P.doc).split("M").filter(Boolean).forEach(d=>{
      const p=document.createElementNS("http://www.w3.org/2000/svg","path");
      p.setAttribute("d","M"+d); svg.appendChild(p);
    });
    return svg;
  }
  LO.icon = icon;

  /* Marca Altoplano: montaña / plateau (SVG relleno, para el logo) */
  function markSVG(){
    return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 24 L13 8 L18 17 L21 12 L28 24 Z" fill="#fff"/>
      <path d="M13 8 L18 17 L15.2 17 L11.5 11 Z" fill="#fff" opacity="0.55"/>
    </svg>`;
  }
  /* Curvas de nivel topográficas (firma visual) */
  function topoSVG(){
    let paths="";
    for(let i=0;i<6;i++){
      const y=30+i*26, a=10+i*3;
      paths+=`<path d="M-40 ${y} C 120 ${y-a}, 260 ${y+a}, 460 ${y-a} S 820 ${y+a}, 1100 ${y-a}" stroke="currentColor" stroke-width="1.4" opacity="${0.9-i*0.11}"/>`;
    }
    return `<svg viewBox="0 0 1000 220" preserveAspectRatio="xMidYMid slice">${paths}</svg>`;
  }
  function topoLayer(){ return el("div",{class:"topo", html:topoSVG()}); }

  /* === 2. UTILIDADES ===================================================== */
  function el(tag, props, children){
    const n = document.createElement(tag);
    if (props) for (const k in props){
      if (k==="class") n.className = props[k];
      else if (k==="html") n.innerHTML = props[k];
      else if (k==="text") n.textContent = props[k];
      else if (k.startsWith("on") && typeof props[k]==="function") n.addEventListener(k.slice(2), props[k]);
      else if (k==="style" && typeof props[k]==="object") Object.assign(n.style, props[k]);
      else if (props[k]!=null && props[k]!==false) n.setAttribute(k, props[k]);
    }
    if (children!=null){
      (Array.isArray(children)?children:[children]).forEach(c=>{
        if (c==null||c===false) return;
        n.appendChild(typeof c==="object" ? c : document.createTextNode(c));
      });
    }
    return n;
  }
  const uid = (p)=> p+"_"+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
  const esc = (s)=> (s==null?"":String(s));
  const bytes = (b)=> b<1024?b+" B": b<1048576?(b/1024).toFixed(0)+" KB":(b/1048576).toFixed(1)+" MB";
  function fmtDate(v){ if(!v) return ""; const d=new Date(v); if(isNaN(d)) return v;
    return d.toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}); }
  LO.el=el;

  /* === 3. STORE (localStorage con respaldo en memoria) =================== */
  const KEY = "livingorg.v1";
  let mem = null;
  const canLS = (()=>{ try{ localStorage.setItem("_t","1"); localStorage.removeItem("_t"); return true; }catch(e){ return false; } })();
  function load(){
    if (mem) return mem;
    if (canLS){ try{ const r=localStorage.getItem(KEY); if(r){ mem=JSON.parse(r); return mem; } }catch(e){} }
    mem = seed(); persist(); return mem;
  }
  function persist(){
    if (!canLS) return;
    try{ localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch(e){ toast("No se pudo guardar (almacenamiento lleno). Reduce el tamaño de los archivos.", true); }
  }
  const Store = {
    all(entity){ const db=load(); return (db[entity]||[]).slice(); },
    get(entity,id){ return (load()[entity]||[]).find(r=>r.id===id); },
    upsert(entity,rec){
      const db=load(); db[entity]=db[entity]||[];
      if (rec.id){ const i=db[entity].findIndex(r=>r.id===rec.id);
        if(i>=0) db[entity][i]={...db[entity][i],...rec}; else db[entity].push(rec); }
      else { rec.id=uid(entity); rec._created=Date.now(); db[entity].push(rec); }
      persist(); return rec;
    },
    remove(entity,id){ const db=load(); db[entity]=(db[entity]||[]).filter(r=>r.id!==id); persist(); },
    reset(){ mem=seed(); persist(); },
  };
  LO.Store = Store;

  /* === 4. HELPERS DE UI (badges, chips, toast, menú) ==================== */
  function statusBadge(key){
    const s = LO.STATUSES[key] || {label:key||"—", color:"#8593A2", dot:"solid"};
    const cls = {ring:"ring",hollow:"hollow",pulse:"pulse"}[s.dot]||"";
    return el("span",{class:"badge "+cls, style:{color:s.color, background:s.color+"14", borderColor:s.color+"33"}},[ el("span",{class:"d"}), s.label ]);
  }
  function actorChip(key){
    const a = LO.ACTOR_TYPES[key]; if(!a) return el("span",{class:"muted"},"—");
    return el("span",{class:"actor", style:{background:a.color}, title:a.desc},
      [ el("span",{class:"k"},a.short), a.label ]);
  }
  function riskPill(key){
    const r = LO.RISK[key]; if(!r) return el("span",{class:"muted"},"—");
    return el("span",{class:"risk-pill", style:{background:r.color+"1f", color:r.color}}, "Riesgo "+r.label);
  }
  let toastBox;
  function toast(msg, danger){
    if(!toastBox){ toastBox=el("div",{class:"toasts"}); document.body.appendChild(toastBox); }
    const t=el("div",{class:"toast"},[ danger?icon("alert","t-ico"):icon("checkCircle","t-ico"), msg ]);
    if(danger) t.querySelector(".t-ico").style.color="var(--err)";
    toastBox.appendChild(t); setTimeout(()=>{ t.style.opacity="0"; setTimeout(()=>t.remove(),250); }, 2600);
  }
  LO.toast=toast;

  /* Menú flotante reutilizable (crear rápido, workspace, notificaciones) */
  let openPop=null;
  function menu(anchor, opts){
    closeMenu();
    const pop=el("div",{class:"pop"});
    (opts.items||[]).forEach(it=>{
      if(it.sep){ pop.appendChild(el("div",{class:"p-sep"})); return; }
      if(it.header){ pop.appendChild(el("div",{class:"p-head"}, it.header)); return; }
      const node=el("div",{class:"p-item"+(it.on?" on":""), onclick:()=>{ closeMenu(); it.onClick&&it.onClick(); }},[
        it.icon? el("span",{class:"pi-ico", style:{background:it.color||"var(--brand)"}}, icon(it.icon)) : null,
        el("span",{}, it.label),
        it.on? el("span",{class:"pi-r"}, icon("check")) : (it.right? el("span",{class:"pi-r"}, it.right):null),
      ]);
      pop.appendChild(node);
    });
    document.body.appendChild(pop);
    const r=anchor.getBoundingClientRect();
    const w=pop.offsetWidth, right=(opts.align==="right");
    pop.style.top=(r.bottom+8)+"px";
    pop.style.left=(right? Math.max(10, r.right-w) : r.left)+"px";
    openPop=pop;
    setTimeout(()=>document.addEventListener("pointerdown", outside, true),0);
    function outside(e){ if(!pop.contains(e.target) && e.target!==anchor && !anchor.contains(e.target)) closeMenu(); }
    pop._outside=outside;
  }
  function closeMenu(){ if(openPop){ document.removeEventListener("pointerdown", openPop._outside, true); openPop.remove(); openPop=null; } }

  function displayName(entity, id){ const r=Store.get(entity,id); return r? (r.name||r.title||id) : "—"; }

  /* === 5. FORMULARIO (modal) generado desde el schema =================== */
  let scrim = el("div",{class:"scrim", onclick:()=>{ closeModal(); closeDrawer(); }});
  document.body.appendChild(scrim);
  let modal = el("div",{class:"modal"}); document.body.appendChild(modal);

  function openForm(entityKey, record){
    // Procesos se capturan 100% por formulario mediante un asistente por
    // pasos (Modo Rápido / Modo Completo) — nunca con el formulario plano
    // genérico. Todas las demás entidades siguen usando este formulario.
    if (entityKey==="proceso") return openProcessWizard(record);
    const def = LO.ENTITIES[entityKey];
    const editing = !!record; record = record ? {...record} : {};
    const collectors = [];

    const grid = el("div",{class:"form-grid"});
    let curSection = editing ? null : "__init";
    def.fields.forEach(f=>{
      if (f.section && f.section!==curSection){ curSection=f.section;
        grid.appendChild(el("div",{class:"form-section"}, f.section)); }
      else if (f.section) curSection=f.section;
      const built = buildField(f, record[f.key]);
      collectors.push({key:f.key, get:built.get});
      grid.appendChild(built.node);
    });

    const sheet = el("div",{class:"sheet"},[
      el("div",{class:"sheet-head"},[
        topoLayer(),
        el("div",{class:"eyebrow"},[
          el("span",{class:"di", style:{background:def.color||"var(--brand)"}}, icon(def.icon)),
          editing?"Editar registro":(def.createTitle?"Nuevo registro":"Nuevo") ]),
        el("h2",{}, editing? ("Editar "+def.label.toLowerCase()) : (def.createTitle||("Crear "+def.label.toLowerCase())) ),
        def.createHint && !editing ? el("p",{}, def.createHint) : null,
      ]),
      el("div",{class:"sheet-body"}, grid),
      el("div",{class:"sheet-foot"},[
        el("button",{class:"btn ghost", onclick:closeModal},"Cancelar"),
        el("div",{class:"spacer"}),
        el("span",{class:"hint"},[ icon("shield"), "Se guarda en este navegador" ]),
        el("button",{class:"btn primary", onclick:save},[ icon("check"), editing?"Guardar cambios":"Guardar" ]),
      ]),
    ]);
    modal.innerHTML=""; modal.appendChild(sheet);
    requestAnimationFrame(()=>{ modal.classList.add("show"); scrim.classList.add("show"); });
    const first = sheet.querySelector("input,textarea,select"); if(first) setTimeout(()=>first.focus(),140);

    function save(){
      const out = editing ? {...record} : {};
      let missing=null;
      for (const c of collectors){
        out[c.key]=c.get();
        const f = def.fields.find(x=>x.key===c.key);
        if (f && f.required && (out[c.key]==null || out[c.key]==="" || (Array.isArray(out[c.key])&&!out[c.key].length))) missing=missing||f.label;
      }
      if (missing){ toast("Falta capturar: "+missing, true); return; }
      const saved = Store.upsert(entityKey, out);
      closeModal();
      toast((editing?"Cambios guardados":def.label+" creado")+" ✓");
      LO.Router.refresh();
      if (!editing) openDetail(entityKey, saved.id);
    }
  }
  LO.openForm=openForm;

  function closeModal(){ modal.classList.remove("show"); if(!drawer.classList.contains("show")) scrim.classList.remove("show"); }

  /* Construye un control según el tipo de campo. Devuelve {node, get}. */
  function buildField(f, value){
    const full = f.col !== 1;
    const wrap = el("div",{class:"fgroup"+(full?" col2":"")});
    if (f.type!=="__none") wrap.appendChild(el("label",{}, [ f.label||f.key, f.required?el("span",{class:"req"},"*"):null ]));

    let getter = ()=> value;

    switch(f.type){
      case "textarea": case "longtext": {
        const ta = el("textarea",{class:"ta grow"+(f.type==="longtext"?" long":""), placeholder:f.placeholder||""}, value||"");
        autoGrow(ta); wrap.appendChild(ta); getter=()=>ta.value.trim();
        break;
      }
      case "number": {
        const i=el("input",{class:"inp", type:"number", value:value??"", placeholder:f.placeholder||""});
        wrap.appendChild(i); getter=()=> i.value===""?null:Number(i.value); break;
      }
      case "date": {
        const i=el("input",{class:"inp", type:"date", value:value||""});
        wrap.appendChild(i); getter=()=>i.value; break;
      }
      case "select": {
        const opts = f.options || (f.optionsFrom? Store.all(f.optionsFrom).map(r=>r.name) : []);
        const s=el("select",{class:"inp"}, [ el("option",{value:""},"— seleccionar —"),
          ...opts.map(o=> el("option",{value:o, selected: value===o?"selected":null}, o)) ]);
        wrap.appendChild(s); getter=()=>s.value; break;
      }
      case "status": {
        const s=el("select",{class:"inp"}, [ el("option",{value:""},"— estado —"),
          ...Object.keys(LO.STATUSES).map(k=> el("option",{value:k, selected:value===k?"selected":null}, LO.STATUSES[k].label)) ]);
        wrap.appendChild(s); getter=()=>s.value; break;
      }
      case "autonomy": {
        const s=el("select",{class:"inp"}, [ el("option",{value:""},"— nivel —"),
          ...Object.keys(LO.AUTONOMY).map(k=> el("option",{value:k, selected:value===k?"selected":null}, LO.AUTONOMY[k].label)) ]);
        wrap.appendChild(s); getter=()=>s.value; break;
      }
      case "risk": {
        const s=el("select",{class:"inp"}, [ el("option",{value:""},"— riesgo —"),
          ...Object.keys(LO.RISK).map(k=> el("option",{value:k, selected:value===k?"selected":null}, LO.RISK[k].label)) ]);
        wrap.appendChild(s); getter=()=>s.value; break;
      }
      case "link": {
        const recs = Store.all(f.linkTo);
        const s=el("select",{class:"inp"}, [ el("option",{value:""},"— ninguno —"),
          ...recs.map(r=> el("option",{value:r.id, selected:value===r.id?"selected":null}, r.name||r.title||r.id)) ]);
        wrap.appendChild(s); getter=()=>s.value; break;
      }
      case "actor": {
        let sel = value||"H";
        const seg = el("div",{class:"actor-seg"});
        Object.keys(LO.ACTOR_TYPES).forEach(k=>{
          const a=LO.ACTOR_TYPES[k];
          const b=el("button",{type:"button", class:(k===sel?"on":""), title:a.desc, onclick:()=>{
            sel=k; seg.querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); }},
            [ el("span",{class:"swatch",style:{background:a.color}}), a.label ]);
          seg.appendChild(b);
        });
        wrap.appendChild(seg); getter=()=>sel; break;
      }
      case "tags": {
        const arr = Array.isArray(value)? value.slice() : (value? String(value).split(",").map(s=>s.trim()).filter(Boolean):[]);
        const box = el("div",{class:"tags"});
        const inp = el("input",{placeholder:"Escribe y Enter…"});
        function paint(){ box.querySelectorAll(".tg").forEach(n=>n.remove());
          arr.forEach((t,i)=>{ const tag=el("span",{class:"tg"},[ t, el("button",{type:"button",onclick:()=>{arr.splice(i,1);paint();}},"×") ]);
            box.insertBefore(tag, inp); }); }
        inp.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===",")&&inp.value.trim()){ e.preventDefault(); arr.push(inp.value.trim()); inp.value=""; paint(); }
          else if(e.key==="Backspace"&&!inp.value&&arr.length){ arr.pop(); paint(); } });
        box.appendChild(inp); paint(); wrap.appendChild(box); getter=()=>arr.slice(); break;
      }
      case "steps": {
        // Trabajo estándar / TWI: nombre + quién ejecuta siempre visibles;
        // rol, herramienta, tiempo y punto de control quedan en divulgación
        // progresiva (un paso corto no obliga a llenar 7 campos).
        let arr = Array.isArray(value)? value.map(s=>({...s})) : [];
        let openIdx = null;
        const list = el("div",{class:"steps"});
        const add = el("button",{type:"button", class:"btn sm", onclick:()=>{ arr.push({name:"",actor:"H"}); openIdx=arr.length-1; paint(); }},[ icon("plus"),"Agregar paso" ]);
        function move(i,dir){ const j=i+dir; if(j<0||j>=arr.length) return; const t=arr[i]; arr[i]=arr[j]; arr[j]=t; if(openIdx===i) openIdx=j; else if(openIdx===j) openIdx=i; paint(); }
        function paint(){ list.innerHTML="";
          arr.forEach((st,i)=>{
            const a=LO.ACTOR_TYPES[st.actor]||LO.ACTOR_TYPES.H;
            const actorBtn=el("button",{type:"button", class:"st-actor", style:{background:a.color}, title:"Clic para cambiar quién ejecuta",
              onclick:()=>{ const ks=Object.keys(LO.ACTOR_TYPES); st.actor=ks[(ks.indexOf(st.actor)+1)%ks.length]; paint(); }}, (LO.ACTOR_TYPES[st.actor]||a).short);
            const nm=el("input",{class:"st-name", value:st.name||"", placeholder:"Nombre del paso…"});
            nm.addEventListener("input",()=> st.name=nm.value);
            const isOpen = openIdx===i;
            const hasExtra = st.role||st.tool||st.time||st.control||st.evidence;
            const more=el("button",{type:"button", class:"st-more"+(hasExtra&&!isOpen?" has":""), title:"Rol, herramienta, tiempo y punto de control",
              "aria-label":"Más detalles del paso", "aria-expanded": isOpen?"true":"false",
              onclick:()=>{ openIdx = isOpen? null : i; paint(); }}, icon(isOpen?"chevD":"chevron"));
            const head=el("div",{class:"step"},[
              el("div",{class:"st-order"},[
                el("button",{type:"button",class:"st-ord",title:"Subir",disabled:i===0,onclick:()=>move(i,-1)}, icon("chevL")),
                el("span",{class:"num"}, i+1),
                el("button",{type:"button",class:"st-ord",title:"Bajar",disabled:i===arr.length-1,onclick:()=>move(i,1)}, icon("chevron")),
              ]),
              nm, actorBtn, more,
              el("button",{type:"button",class:"st-del",title:"Eliminar paso",onclick:()=>{arr.splice(i,1); if(openIdx===i)openIdx=null; paint();}}, icon("trash")) ]);
            list.appendChild(head);
            if (isOpen){
              const roleI=el("input",{class:"inp sm",value:st.role||"",placeholder:"Ej. Ejecutivo Comercial"});
              roleI.addEventListener("input",()=>st.role=roleI.value);
              const toolI=el("input",{class:"inp sm",value:st.tool||"",placeholder:"Ej. ERPNext, WhatsApp…"});
              toolI.addEventListener("input",()=>st.tool=toolI.value);
              const timeI=el("input",{class:"inp sm",type:"number",min:"0",value:st.time??"",placeholder:"min"});
              timeI.addEventListener("input",()=>st.time=timeI.value===""?null:Number(timeI.value));
              const ctrlLbl=el("label",{class:"st-ctrl"},[ el("input",{type:"checkbox",checked:st.control?"checked":null,
                onchange:e=>st.control=e.target.checked}), " Punto de control" ]);
              const evI=el("input",{class:"inp sm",value:st.evidence||"",placeholder:"Qué prueba que el paso se hizo"});
              evI.addEventListener("input",()=>st.evidence=evI.value);
              list.appendChild(el("div",{class:"step-extra"},[
                el("div",{class:"fgroup"},[el("label",{},"Rol responsable"),roleI]),
                el("div",{class:"fgroup"},[el("label",{},"Herramienta / sistema"),toolI]),
                el("div",{class:"fgroup"},[el("label",{},"Tiempo estimado (min)"),timeI]),
                el("div",{class:"fgroup"},[el("label",{},"Evidencia del paso"),evI]),
                el("div",{class:"fgroup col2"},[ctrlLbl]),
              ]));
            }
          });
          list.appendChild(add);
        }
        paint(); wrap.appendChild(list); getter=()=>arr.filter(s=>s.name); break;
      }
      case "metas": {
        // Metas por cadencia (OKR + Hoshin Kanri): dato estructurado, no
        // texto suelto. La meta mensual puede descomponerse en cascada.
        let arr = Array.isArray(value)? value.map(m=>({...m})) : [];
        const CADS = ["diaria","semanal","quincenal","mensual"];
        const CAD_LABEL = {diaria:"Diaria",semanal:"Semanal",quincenal:"Quincenal",mensual:"Mensual"};
        const list = el("div",{class:"metas"});
        const add = el("button",{type:"button", class:"btn sm", onclick:()=>{ arr.push({cadencia:"mensual",metrica:"",objetivo:null,unidad:"",tolerancia:"",responsable:"",direccion:"mas"}); paint(); }},[ icon("plus"),"Agregar meta" ]);
        const cascade = el("button",{type:"button", class:"btn sm ghost", title:"Propone diaria/semanal/quincenal a partir de la mensual (~22 días hábiles, ~4.33 semanas, 2 quincenas/mes)", onclick:()=>{
          const base = arr.find(m=>m.cadencia==="mensual" && m.objetivo);
          if(!base){ toast("Captura primero una meta mensual con objetivo numérico.", true); return; }
          const factor = {diaria:22, semanal:4.33, quincenal:2};
          CADS.filter(c=>c!=="mensual").forEach(c=>{
            const val = Math.round((base.objetivo/factor[c])*10)/10;
            let row = arr.find(m=>m.cadencia===c && m.metrica===base.metrica);
            if(!row){ row={cadencia:c, metrica:base.metrica, unidad:base.unidad, responsable:base.responsable, direccion:base.direccion, tolerancia:base.tolerancia}; arr.unshift(row); }
            row.objetivo = val;
          });
          paint(); toast("Cascada propuesta. Ajusta lo que necesites.");
        }},[ icon("sparkle"), "Sugerir cascada desde la mensual" ]);
        function paint(){ list.innerHTML="";
          if(!arr.length){ list.appendChild(el("div",{class:"muted",style:{fontSize:"12.5px",padding:"4px 0 10px"}},"Sin metas capturadas todavía. Empieza por la meta mensual.")); }
          arr.forEach((m,i)=>{
            const cad=el("select",{class:"inp sm"}, CADS.map(c=>el("option",{value:c,selected:m.cadencia===c?"selected":null},CAD_LABEL[c])));
            cad.addEventListener("change",()=>m.cadencia=cad.value);
            const met=el("input",{class:"inp sm",style:{minWidth:"140px"},value:m.metrica||"",placeholder:"Métrica / KPI"});
            met.addEventListener("input",()=>m.metrica=met.value);
            const obj=el("input",{class:"inp sm",type:"number",style:{width:"84px"},value:m.objetivo??"",placeholder:"Objetivo"});
            obj.addEventListener("input",()=>m.objetivo=obj.value===""?null:Number(obj.value));
            const uni=el("input",{class:"inp sm",style:{width:"70px"},value:m.unidad||"",placeholder:"Unidad"});
            uni.addEventListener("input",()=>m.unidad=uni.value);
            const tol=el("input",{class:"inp sm",style:{width:"70px"},value:m.tolerancia||"",placeholder:"Tolerancia"});
            tol.addEventListener("input",()=>m.tolerancia=tol.value);
            const resp=el("input",{class:"inp sm",style:{minWidth:"120px"},value:m.responsable||"",placeholder:"Responsable"});
            resp.addEventListener("input",()=>m.responsable=resp.value);
            const dir=el("select",{class:"inp sm"},[
              el("option",{value:"mas",selected:m.direccion!=="menos"?"selected":null},"Más es mejor"),
              el("option",{value:"menos",selected:m.direccion==="menos"?"selected":null},"Menos es mejor")]);
            dir.addEventListener("change",()=>m.direccion=dir.value);
            list.appendChild(el("div",{class:"meta-row"},[ cad, met, obj, uni, tol, resp, dir,
              el("button",{type:"button",class:"st-del",title:"Quitar meta",onclick:()=>{arr.splice(i,1);paint();}}, icon("trash")) ]));
          });
          list.appendChild(el("div",{class:"row",style:{gap:"8px",marginTop:"6px",flexWrap:"wrap"}},[add,cascade]));
        }
        paint(); wrap.appendChild(list);
        getter=()=>arr.filter(m=>m.metrica && m.objetivo!=null);
        break;
      }
      case "files": {
        let arr = Array.isArray(value)? value.slice() : [];
        const list = el("div",{class:"dz-list"});
        const input = el("input",{type:"file", multiple:"multiple", class:"hide"});
        const dz = el("div",{class:"dropzone"},[
          icon("upload","dz-ico"),
          el("b",{},"Arrastra archivos aquí"),
          el("span",{}," o haz clic para seleccionar"),
          el("small",{},".docx · .pdf · .xlsx · imágenes · cualquier archivo que alimente la base"),
        ]);
        function paintFiles(){ list.innerHTML="";
          arr.forEach((fl,i)=> list.appendChild(fileChip(fl, ()=>{ arr.splice(i,1); paintFiles(); }))); }
        function ingest(files){
          [...files].forEach(file=>{
            if (file.size > 4*1024*1024){ toast("“"+file.name+"” supera 4 MB para el demo local.", true); return; }
            const r=new FileReader();
            r.onload=()=>{ arr.push({id:uid("f"), name:file.name, type:file.type, size:file.size, data:r.result}); paintFiles(); };
            r.readAsDataURL(file);
          });
        }
        dz.addEventListener("click",()=>input.click());
        input.addEventListener("change",()=>{ ingest(input.files); input.value=""; });
        ["dragover","dragenter"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag");}));
        ["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag");}));
        dz.addEventListener("drop",e=>{ if(e.dataTransfer.files.length) ingest(e.dataTransfer.files); });
        paintFiles();
        wrap.appendChild(dz); wrap.appendChild(input); wrap.appendChild(list);
        getter=()=>arr.slice(); break;
      }
      default: {
        const i=el("input",{class:"inp", type:"text", value:value??"", placeholder:f.placeholder||""});
        wrap.appendChild(i); getter=()=>i.value.trim();
      }
    }
    if (f.help) wrap.appendChild(el("div",{class:"fhelp"}, f.help));
    return { node:wrap, get:getter };
  }

  function autoGrow(ta){
    const min = ta.classList.contains("long")?220:96;
    const fit=()=>{ ta.style.height="auto"; ta.style.height=Math.max(ta.scrollHeight+2, min)+"px"; };
    ta.addEventListener("input",fit); requestAnimationFrame(fit);
  }
  function fileIconExt(name){ const e=(name.split(".").pop()||"").toUpperCase().slice(0,4);
    const c={PDF:"#D84C4C",DOC:"#2E64C8",DOCX:"#2E64C8",XLS:"#1F9D6B",XLSX:"#1F9D6B",PNG:"#8067EE",JPG:"#8067EE",JPEG:"#8067EE"}[e]||"#5C6B7A";
    return {ext:e,color:c}; }
  function fileChip(fl, onRemove){
    const {ext,color}=fileIconExt(fl.name);
    return el("div",{class:"filechip"},[
      el("div",{class:"fi", style:{background:color}}, ext),
      el("div",{class:"fmeta"},[ el("b",{title:fl.name}, fl.name), el("span",{}, bytes(fl.size||0)) ]),
      el("a",{class:"dl", href:fl.data, download:fl.name, title:"Descargar", onclick:e=>e.stopPropagation()}, icon("download")),
      onRemove? el("button",{class:"rm", type:"button", title:"Quitar", onclick:e=>{e.stopPropagation();onRemove();}}, icon("close")) : null,
    ]);
  }

  /* === 6. DRAWER — Inspector / "contrato operativo" ===================== */
  let drawer = el("aside",{class:"drawer"}); document.body.appendChild(drawer);
  function closeDrawer(){ drawer.classList.remove("show"); if(!modal.classList.contains("show")) scrim.classList.remove("show"); setCrumbRecord(null); }

  /* Agrega o quita el segmento "/ Registro" de las migas mientras el panel de
     detalle está abierto — así el nombre editado también se refleja ahí. */
  function setCrumbRecord(label){
    const crumb=document.getElementById("crumb"); if(!crumb) return;
    let seg=crumb.querySelector(".crumb-record"), sep=crumb.querySelector(".crumb-record-sep");
    if (label){
      if (!seg){ sep=el("span",{class:"sep crumb-record-sep"},"/"); seg=el("span",{class:"cur crumb-record"},""); crumb.appendChild(sep); crumb.appendChild(seg); }
      seg.textContent=label;
    } else { if(seg) seg.remove(); if(sep) sep.remove(); }
  }

  function openDetail(entityKey, id){
    const def = LO.ENTITIES[entityKey];
    const rec = Store.get(entityKey, id); if(!rec) return;
    setCrumbRecord(rec.name||rec.title||def.label);
    const body = el("div",{class:"drawer-body"});

    let curSection=null;
    def.fields.forEach(f=>{
      if (f.type==="__none") return;
      const v = rec[f.key];
      const isEmpty = v==null || v==="" || (Array.isArray(v)&&!v.length);
      if (f.section && f.section!==curSection){ curSection=f.section; body.appendChild(el("div",{class:"section-title"}, f.section)); }
      const row = el("div",{class:"field-row"});
      row.appendChild(el("div",{class:"fl"}, f.label||f.key));
      row.appendChild(renderValue(f, v, isEmpty));
      body.appendChild(row);
    });

    const meta = el("div",{class:"meta"});
    if (rec.status) meta.appendChild(statusBadge(rec.status));
    if (rec.actor) meta.appendChild(actorChip(rec.actor));
    if (rec.risk) meta.appendChild(riskPill(rec.risk));
    if (rec.autonomy && LO.AUTONOMY[rec.autonomy]) meta.appendChild(el("span",{class:"badge"}, LO.AUTONOMY[rec.autonomy].label));

    const foot = el("div",{class:"drawer-foot"});
    if (entityKey==="aprobacion"){
      foot.appendChild(el("button",{class:"btn primary", onclick:()=>{ Store.upsert(entityKey,{id, status:"Aprobado"}); toast("Aprobación registrada ✓"); openDetail(entityKey,id); LO.Router.refresh(); }},[icon("check"),"Aprobar"]));
      foot.appendChild(el("button",{class:"btn danger", onclick:()=>{ Store.upsert(entityKey,{id, status:"Rechazado"}); toast("Marcado como rechazado"); openDetail(entityKey,id); LO.Router.refresh(); }},"Rechazar"));
      foot.appendChild(el("div",{class:"spacer",style:{flex:1}}));
    }
    if (entityKey==="proceso"){
      foot.appendChild(el("button",{class:"btn ghost", title:"Duplicar y ajustar", onclick:()=> duplicateProcess(rec)},[ icon("layers"),"Duplicar" ]));
    }
    foot.appendChild(el("button",{class:"btn", onclick:()=>{ closeDrawer(); openForm(entityKey, rec); }},[ icon("edit"),"Editar" ]));
    foot.appendChild(el("button",{class:"btn danger icon", title:"Eliminar", onclick:()=>{
      if(confirm("¿Eliminar “"+(rec.name||rec.title)+"”? Esta acción no se puede deshacer.")){
        Store.remove(entityKey,id); closeDrawer(); toast("Eliminado"); LO.Router.refresh(); } }}, icon("trash")));

    drawer.innerHTML="";
    drawer.appendChild(el("div",{class:"drawer-head"},[
      el("button",{class:"btn ghost icon x-close", onclick:closeDrawer}, icon("close")),
      el("div",{class:"eyebrow"},[ el("span",{class:"di", style:{background:def.color||"var(--brand)"}}, icon(def.icon)), def.label ]),
      el("h2",{}, rec.name||rec.title||"Detalle"),
      meta,
    ]));
    drawer.appendChild(body);
    drawer.appendChild(foot);
    requestAnimationFrame(()=>{ drawer.classList.add("show"); scrim.classList.add("show"); });
  }
  LO.openDetail=openDetail;

  function renderValue(f, v, isEmpty){
    if (isEmpty) return el("div",{class:"fv empty"},"Sin capturar");
    switch(f.type){
      case "status": return statusBadge(v);
      case "actor":  return actorChip(v);
      case "risk":   return riskPill(v);
      case "autonomy": return el("span",{class:"badge solid"}, (LO.AUTONOMY[v]||{label:v}).label);
      case "link":   return el("a",{href:"#", onclick:e=>{e.preventDefault(); closeDrawer(); setTimeout(()=>openDetail(f.linkTo, v),300);}}, displayName(f.linkTo, v));
      case "tags":   return el("div",{class:"filechips"}, (v||[]).map(t=> el("span",{class:"badge solid"}, t)));
      case "files":  return el("div",{class:"filechips"}, (v||[]).map(fl=> fileChip(fl, null)));
      case "steps":  return el("div",{class:"steps read"}, (v||[]).map((s,i)=> el("div",{class:"step read-row"},[
                        el("div",{class:"step"},[ el("span",{class:"num"}, i+1), el("span",{style:{flex:"1"}}, s.name),
                        actorChip(s.actor) ]),
                        (s.role||s.tool||s.time||s.control) ? el("div",{class:"step-meta"},[
                          s.role? el("span",{class:"badge"},[icon("role"),s.role]):null,
                          s.tool? el("span",{class:"badge"},[icon("plug"),s.tool]):null,
                          s.time? el("span",{class:"badge"},[icon("clock"),s.time+" min"]):null,
                          s.control? el("span",{class:"badge solid"},[icon("checkCircle"),"Punto de control"]):null,
                        ]) : null ])));
      case "metas":  return el("div",{class:"metas read"}, (v||[]).length ? (v||[]).map(m=> el("div",{class:"meta-row read"},[
                        el("span",{class:"badge"}, {diaria:"Diaria",semanal:"Semanal",quincenal:"Quincenal",mensual:"Mensual"}[m.cadencia]||m.cadencia),
                        el("b",{style:{flex:"1"}}, m.metrica),
                        el("span",{class:"mono"}, (m.direccion==="menos"?"≤ ":"≥ ")+m.objetivo+" "+(m.unidad||"")),
                        m.tolerancia? el("span",{class:"muted",style:{fontSize:"11.5px"}}, "tol. "+m.tolerancia):null,
                        m.responsable? el("span",{class:"badge"},[icon("person"),m.responsable]):null,
                      ])) : [el("div",{class:"fv empty"},"Sin capturar")]);
      case "longtext": return el("div",{class:"fv mono"}, esc(v));
      default: return el("div",{class:"fv"}, esc(v));
    }
  }

  /* === 7. VISTA GENÉRICA DE LISTA ======================================= */
  function listView(entityKey){
    const def = LO.ENTITIES[entityKey];
    const wrap = el("div",{class:"wrap route-in"});
    let mode = (canLS && localStorage.getItem("lo.view."+entityKey)) || "table";
    let q = "";

    const head = el("div",{class:"pagehead"},[
      el("div",{class:"h-txt"},[
        el("div",{class:"eyebrow"}, groupOf(entityKey)),
        el("h1",{}, def.plural),
        el("p",{}, subtitleFor(entityKey)) ]),
      el("div",{class:"h-actions"},[
        el("button",{class:"btn primary", onclick:()=>openForm(entityKey)},[ icon("plus"), (def.createTitle||("Crear "+def.label.toLowerCase())) ]),
      ]),
    ]);
    const toolbar = el("div",{class:"toolbar"});
    const search = el("div",{class:"filter"},[ icon("search"),
      el("input",{placeholder:"Buscar en "+def.plural.toLowerCase()+"…", oninput:e=>{ q=e.target.value.toLowerCase(); paint(); }}) ]);
    const toggle = el("div",{class:"chip-toggle"},[
      el("button",{class:mode==="table"?"on":"", onclick:()=>setMode("table")}, [icon("list"),"Tabla"]),
      el("button",{class:mode==="cards"?"on":"", onclick:()=>setMode("cards")}, [icon("grid"),"Tarjetas"]),
    ]);
    toolbar.appendChild(search); toolbar.appendChild(el("div",{style:{flex:"1"}})); toolbar.appendChild(toggle);
    const body = el("div",{class:"list-body"});
    wrap.appendChild(head); wrap.appendChild(toolbar); wrap.appendChild(body);

    function setMode(m){ mode=m; if(canLS) localStorage.setItem("lo.view."+entityKey,m);
      toggle.querySelectorAll("button").forEach(b=>b.classList.remove("on"));
      toggle.children[m==="table"?0:1].classList.add("on"); paint(); }

    function rows(){
      let list = Store.all(entityKey);
      if (q) list = list.filter(r=> JSON.stringify(r).toLowerCase().includes(q));
      return list.sort((a,b)=> (b._created||0)-(a._created||0));
    }
    function paint(){
      const list = rows(); body.innerHTML="";
      if (!list.length){ body.appendChild(emptyState(def, entityKey, q)); return; }
      body.appendChild(mode==="table" ? tableFor(entityKey, list) : cardsFor(entityKey, list));
    }
    paint();
    wrap._refresh = paint;
    return wrap;
  }

  function cellValue(f, r){
    const v=r[f.key];
    if (v==null||v==="") return el("span",{class:"muted"},"—");
    switch(f.type){
      case "status": return statusBadge(v);
      case "actor": return actorChip(v);
      case "risk": return riskPill(v);
      case "autonomy": return el("span",{class:"badge"}, (LO.AUTONOMY[v]||{label:v}).label);
      case "date": return el("span",{}, fmtDate(v));
      case "link": return el("span",{}, displayName(f.linkTo, v));
      case "tags": return el("span",{class:"muted"}, (v||[]).slice(0,3).join(" · ")+((v.length>3)?" +"+(v.length-3):""));
      case "files": return el("span",{class:"badge"},[icon("doc"), (v.length||0)+""]);
      default: return el("span",{}, String(v).slice(0,60));
    }
  }
  function tableFor(entityKey, list){
    const def=LO.ENTITIES[entityKey];
    const cols = (def.listColumns||["name","status"]).map(k=> def.fields.find(f=>f.key===k)).filter(Boolean);
    const thead=el("thead",{},el("tr",{}, [ ...cols.map(c=> el("th",{}, c.label)), el("th",{}) ]));
    const tb=el("tbody",{});
    list.forEach(r=>{
      const tr=el("tr",{ onclick:()=>openDetail(entityKey,r.id) });
      cols.forEach((c,i)=>{
        if (i===0){ tr.appendChild(el("td",{},[ el("div",{class:"name-cell"},[
            el("span",{class:"rico", style:{background:(def.color||"var(--brand)")+"1a", color:def.color||"var(--brand)"}}, icon(def.icon)),
            el("div",{},[ el("b",{}, r.name||r.title||"—"), r.owner? el("small",{}, r.owner):null ]) ]) ])); }
        else tr.appendChild(el("td",{}, cellValue(c,r)));
      });
      tr.appendChild(el("td",{style:{textAlign:"right"}}, el("button",{class:"btn ghost icon rowmenu", title:"Editar",
        onclick:e=>{ e.stopPropagation(); openForm(entityKey,r); }}, icon("edit"))));
      tb.appendChild(tr);
    });
    return el("table",{class:"tbl"},[thead,tb]);
  }
  function cardsFor(entityKey, list){
    const def=LO.ENTITIES[entityKey];
    const grid=el("div",{class:"grid g-3"});
    list.forEach(r=>{
      const c=el("div",{class:"card kpi-card", style:{cursor:"pointer"}, onclick:()=>openDetail(entityKey,r.id)});
      c.appendChild(el("div",{class:"row between"},[
        el("div",{class:"row"},[
          el("span",{class:"kpi-ico", style:{width:"36px",height:"36px",background:(def.color||"var(--brand)")+"1a",color:def.color||"var(--brand)"}}, icon(def.icon)),
          el("b",{style:{fontSize:"14.5px",fontFamily:"var(--ff-display)"}}, r.name||r.title||"—") ]),
        r.status?statusBadge(r.status):null ]));
      const sub = r.purpose||r.objective||r.mission||r.summary||r.notes||"";
      if (sub) c.appendChild(el("p",{class:"muted",style:{margin:"12px 0 0",fontSize:"13px",lineHeight:"1.55"}}, String(sub).slice(0,120)+(sub.length>120?"…":"")));
      const foot=el("div",{class:"row",style:{marginTop:"14px",gap:"8px",flexWrap:"wrap"}});
      if (r.owner) foot.appendChild(el("span",{class:"badge"},[icon("person"),r.owner]));
      if (r.actor) foot.appendChild(actorChip(r.actor));
      if (r.risk) foot.appendChild(riskPill(r.risk));
      if (Array.isArray(r.docs)&&r.docs.length) foot.appendChild(el("span",{class:"badge"},[icon("doc"), r.docs.length+" doc"]));
      c.appendChild(foot);
      grid.appendChild(c);
    });
    return grid;
  }
  function emptyState(def, entityKey, q){
    if (q) return el("div",{class:"empty"},[ topoLayer(),
      el("div",{class:"e-ico"}, icon("search")),
      el("h3",{}, "Sin resultados"),
      el("p",{}, "No hay "+def.plural.toLowerCase()+" que coincidan con “"+q+"”.") ]);
    return el("div",{class:"empty"},[ topoLayer(),
      el("div",{class:"e-ico"}, icon(def.icon)),
      el("h3",{}, "Aún no hay "+def.plural.toLowerCase()),
      el("p",{}, "Crea el primero para empezar a construir tu modelo vivo."),
      el("button",{class:"btn primary", onclick:()=>openForm(entityKey)},[ icon("plus"), "Crear "+def.label.toLowerCase() ]),
    ]);
  }
  function subtitleFor(k){
    return ({
      proceso:"Inventario de procesos con owner, estado, riesgo y autonomía.",
      sop:"Procedimientos vivos: instrucciones amplias + documentos de respaldo.",
      agente:"Agentes gobernados: propósito, herramientas, autonomía y presupuesto.",
      prompt:"Prompts versionados con schema de salida y casos de prueba.",
      fuente:"Fuentes con permisos, vigencia y archivos originales.",
      run:"Instancias de ejecución con estado y evidencia.",
      tarea:"Trabajo humano e híbrido asignado.",
      aprobacion:"Decisiones pendientes con contexto para resolver.",
      conector:"Salud real de integraciones y procesos dependientes.",
      politica:"Reglas de permisos, riesgo, herramientas y autonomía.",
    })[k] || "";
  }
  function groupOf(entityKey){
    let g=""; LO.NAV.forEach(grp=>grp.items.forEach(i=>{ if(i.entity===entityKey) g=grp.group; }));
    return g;
  }

  /* === 7B. ASISTENTE DE PROCESO (Modo Rápido / Modo Completo) ============
     Captura 100% por formulario del objeto "proceso": nunca un desplegable
     ni un acordeón deciden qué se está editando — es siempre un asistente
     por pasos. Ver documento "Rediseño del Módulo de Procesos LIVINGORG OS".
     ======================================================================= */
  const PROC_DEF = ()=> LO.ENTITIES.proceso;
  const QUICK_KEYS = ["name","purpose","owner","trigger","steps","kpis","metas","status"];

  /* Agrupa los campos de "proceso" por su `section`, en el orden del schema —
     son, a la vez, los 6 pasos del asistente (Modo Completo). */
  function processSections(){
    const out=[]; let cur=null;
    PROC_DEF().fields.forEach(f=>{
      if (f.section){ cur={title:f.section, fields:[]}; out.push(cur); }
      if (!cur){ cur={title:"Identidad y propósito", fields:[]}; out.push(cur); }
      cur.fields.push(f);
    });
    return out;
  }

  /* Checklist de calidad (gate de publicación) — sección 7.1 del documento.
     Solo se exige para pasar a "Activo"; en cualquier otro estado el
     proceso se guarda con lo que el usuario ya capturó. */
  function canPublishProcess(rec){
    const issues=[];
    if (!rec.purpose) issues.push("Falta el propósito.");
    if (!rec.outcome) issues.push("Falta el resultado esperado.");
    if (!rec.owner) issues.push("Falta el dueño / responsable (Aprobador).");
    if (!rec.trigger) issues.push("Falta el disparador.");
    if (!(rec.inputs||[]).length) issues.push("Falta al menos una entrada (SIPOC).");
    if (!(rec.outputs||[]).length) issues.push("Falta al menos una salida (SIPOC).");
    const steps = rec.steps||[];
    if (steps.length<3) issues.push("Se necesitan al menos 3 pasos (hay "+steps.length+").");
    else if (steps.some(s=>!s.actor)) issues.push("Todos los pasos deben declarar quién ejecuta.");
    if (!(rec.kpis||[]).length) issues.push("Falta al menos 1 KPI.");
    const metaMensual = (rec.metas||[]).find(m=>m.cadencia==="mensual" && m.objetivo!=null);
    if (!metaMensual) issues.push("Falta la meta mensual (con objetivo numérico).");
    else if (!metaMensual.tolerancia) issues.push("La meta mensual necesita una tolerancia.");
    if (!rec.dod) issues.push("Falta la Definición de Hecho (DoD).");
    if (!rec.risk) issues.push("Falta evaluar el riesgo.");
    if (rec.risk==="high" && !rec.controls) issues.push("Riesgo alto: define controles.");
    if (rec.risk==="high" && !rec.gates) issues.push("Riesgo alto: define al menos un punto de aprobación (gate).");
    return issues;
  }
  function showPublishBlocked(issues){
    const body=el("div",{},[
      el("p",{}, "No se puede publicar como Activo mientras existan estos pendientes (checklist de calidad, sección 7.1):"),
      el("div",{class:"filechips",style:{display:"grid",gap:"6px"}}, issues.map(m=> el("div",{class:"row",style:{gap:"8px",fontSize:"13px"}},[icon("alert"),m]))),
    ]);
    openMiniModal("No se puede publicar", body, [{label:"Entendido", cls:"btn primary", onClick:closeMiniModal}]);
  }
  /* Modal simple reutilizable para avisos (checklist, confirmaciones de la wizard). */
  let miniModal=null;
  function openMiniModal(title, bodyNode, actions){
    closeMiniModal();
    miniModal = el("div",{class:"scrim show", style:{zIndex:"90"}});
    const box=el("div",{class:"sheet", style:{maxWidth:"460px",margin:"10vh auto"}},[
      el("div",{class:"sheet-head"},[ el("h2",{}, title) ]),
      el("div",{class:"sheet-body"}, bodyNode),
      el("div",{class:"sheet-foot"}, actions.map(a=> el("button",{class:a.cls||"btn", onclick:a.onClick}, a.label))),
    ]);
    miniModal.appendChild(box);
    miniModal.addEventListener("click",e=>{ if(e.target===miniModal) closeMiniModal(); });
    document.body.appendChild(miniModal);
  }
  function closeMiniModal(){ if(miniModal){ miniModal.remove(); miniModal=null; } }

  function openProcessWizard(record){
    const def = PROC_DEF();
    const editing = !!record;
    let rec = editing ? {...record} : {};
    let mode = editing ? "full" : null;   // null → pantalla de elección
    let stepIdx = 0, maxReached = 0;
    const sections = processSections();

    function render(){
      if (mode===null) return renderModeChoice();
      if (mode==="quick") return renderQuick();
      return renderFullStep();
    }

    function shellSheet(head, body, foot){
      const sheet=el("div",{class:"sheet wizard"},[
        el("div",{class:"sheet-head"},[ topoLayer(), head ]),
        el("div",{class:"sheet-body"}, body),
        el("div",{class:"sheet-foot"}, foot),
      ]);
      modal.innerHTML=""; modal.appendChild(sheet);
      requestAnimationFrame(()=>{ modal.classList.add("show"); scrim.classList.add("show"); });
      const first=sheet.querySelector("input,textarea,select"); if(first) setTimeout(()=>first.focus(),140);
    }

    function renderModeChoice(){
      const head=el("div",{},[
        el("div",{class:"eyebrow"},[ el("span",{class:"di", style:{background:def.color}}, icon(def.icon)), "Nuevo proceso" ]),
        el("h2",{},"¿Cómo quieres capturarlo?"),
        el("p",{},"Puedes empezar rápido y enriquecer después — nunca se pierde lo ya escrito."),
      ]);
      const quickCard=el("div",{class:"mode-card", tabindex:"0", role:"button", onclick:()=>{ mode="quick"; render(); },
        onkeydown:e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); mode="quick"; render(); } }},[
        el("div",{class:"mc-ico"}, icon("zap")),
        el("b",{},"Modo Rápido"), el("span",{},"7 campos · menos de 2 minutos"),
        el("p",{},"Proceso mínimo viable: nombre, propósito, dueño, disparador, pasos, KPI y meta mensual."),
      ]);
      const fullCard=el("div",{class:"mode-card", tabindex:"0", role:"button", onclick:()=>{ mode="full"; render(); },
        onkeydown:e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); mode="full"; render(); } }},[
        el("div",{class:"mc-ico"}, icon("layers")),
        el("b",{},"Modo Completo"), el("span",{},"6 pasos · 8–12 minutos"),
        el("p",{},"SIPOC, RACI, controles, metas por cadencia y mejora continua — el esquema completo."),
      ]);
      const body=el("div",{class:"mode-choice"},[quickCard,fullCard]);
      const foot=[ el("button",{class:"btn ghost", onclick:closeModal},"Cancelar") ];
      shellSheet(head, body, foot);
    }

    function collectFields(container, fields){
      fields.forEach(f=>{
        const holder = container.querySelector('[data-fkey="'+f.key+'"]');
        if (holder && holder._get) rec[f.key]=holder._get();
      });
    }
    function buildFieldsInto(grid, fields){
      let curSection=null;
      fields.forEach(f=>{
        if (f.section && f.section!==curSection){ curSection=f.section; grid.appendChild(el("div",{class:"form-section"}, f.section)); }
        const built = buildField(f, rec[f.key]);
        built.node.setAttribute("data-fkey", f.key);
        built.node._get = built.get;
        grid.appendChild(built.node);
      });
    }
    function missingRequired(fields){
      return fields.filter(f=> f.required && (rec[f.key]==null || rec[f.key]==="" || (Array.isArray(rec[f.key])&&!rec[f.key].length)));
    }

    function renderQuick(){
      const fields = QUICK_KEYS.map(k=> def.fields.find(f=>f.key===k)).filter(Boolean);
      const head=el("div",{},[
        el("div",{class:"eyebrow"},[ el("span",{class:"di", style:{background:def.color}}, icon(def.icon)), "Modo Rápido" ]),
        el("h2",{},"Proceso mínimo viable"),
        el("p",{},"Con esto ya es un proceso utilizable. Podrás enriquecerlo después con SIPOC, RACI y más metas."),
      ]);
      const grid=el("div",{class:"form-grid"});
      buildFieldsInto(grid, fields);
      const foot=[
        el("button",{class:"btn ghost", onclick:closeModal},"Cancelar"),
        el("button",{class:"btn ghost", onclick:()=>{ collectFields(grid, fields); mode="full"; stepIdx=0; render(); }},"Prefiero el modo completo"),
        el("div",{class:"spacer"}),
        el("button",{class:"btn primary", onclick:()=>{
          collectFields(grid, fields);
          if (!rec.status) rec.status="draft";
          finish();
        }},[ icon("check"), "Guardar" ]),
      ];
      shellSheet(head, grid, foot);
    }

    function renderFullStep(){
      if (stepIdx>maxReached) maxReached=stepIdx;
      const sec = sections[stepIdx];
      const stepsNav = el("div",{class:"wiz-steps"}, sections.map((s,i)=>
        el("button",{type:"button", class:"wiz-step"+(i===stepIdx?" on":"")+(i<stepIdx?" done":""),
          disabled: i>maxReached, "aria-current": i===stepIdx?"step":null,
          onclick:()=>{ if(i<=maxReached){ collectFields(grid, sec.fields); stepIdx=i; render(); } }},[
          el("span",{class:"wiz-num"}, i<stepIdx? icon("check") : (i+1)), el("span",{class:"wiz-lbl"}, s.title) ])));
      const head=el("div",{},[
        el("div",{class:"eyebrow"},[ el("span",{class:"di", style:{background:def.color}}, icon(def.icon)),
          editing?"Editar proceso":"Nuevo proceso", " · paso "+(stepIdx+1)+" de "+sections.length ]),
        el("h2",{}, sec.title),
        stepsNav,
      ]);
      const grid=el("div",{class:"form-grid"});
      buildFieldsInto(grid, sec.fields);
      const isLast = stepIdx===sections.length-1;
      const foot=[
        el("button",{class:"btn ghost", onclick:closeModal},"Cancelar"),
        el("button",{class:"btn ghost", onclick:()=>{ collectFields(grid, sec.fields); toast("Guardado como borrador ✓"); Store.upsert("proceso", {...rec, status: rec.status||"draft"}); closeModal(); LO.Router.refresh(); }},[icon("check"),"Guardar borrador y salir"]),
        el("div",{class:"spacer"}),
        stepIdx>0? el("button",{class:"btn", onclick:()=>{ collectFields(grid, sec.fields); stepIdx--; render(); }},[icon("chevL"),"Atrás"]) : null,
        el("button",{class:"btn primary", onclick:()=>{
          collectFields(grid, sec.fields);
          const missing = missingRequired(sec.fields);
          if (missing.length){ toast("Falta capturar: "+missing.map(f=>f.label).join(", "), true); return; }
          if (isLast) finish(); else { stepIdx++; render(); }
        }},[ isLast?icon("check"):null, isLast?"Guardar proceso":"Siguiente", isLast?null:icon("chevron") ]),
      ];
      shellSheet(head, grid, foot);
    }

    function finish(){
      if ((rec.status||"draft")==="active"){
        const issues = canPublishProcess(rec);
        if (issues.length){ showPublishBlocked(issues); return; }
      }
      if (!rec.status) rec.status="draft";
      const saved = Store.upsert("proceso", rec);
      closeModal();
      toast((editing?"Cambios guardados":"Proceso creado")+" ✓");
      LO.Router.refresh();
      openDetail("proceso", saved.id);
    }

    render();
  }
  LO.openProcessWizard = openProcessWizard;

  function duplicateProcess(rec){
    const copy = {...rec};
    delete copy.id; delete copy._created;
    copy.name = (rec.name||"Proceso")+" (copia)";
    copy.status = "draft"; copy.version="";
    const saved = Store.upsert("proceso", copy);
    toast("Proceso duplicado — ajusta lo que cambie");
    closeDrawer();
    LO.Router.refresh();
    openProcessWizard(saved);
  }

  /* === 8. CENTRO DE MANDO (Dashboard) =================================== */
  function dashboard(){
    const wrap = el("div",{class:"wrap route-in"});
    const proc=Store.all("proceso"), runs=Store.all("run"), appr=Store.all("aprobacion"),
          conn=Store.all("conector"), tasks=Store.all("tarea"), sops=Store.all("sop");
    const blocked = proc.filter(p=>p.status==="blocked"||p.status==="degraded");
    const pendAppr = appr.filter(a=>(a.status||"Pendiente")==="Pendiente");
    const degraded = conn.filter(c=>c.status==="degraded"||c.status==="blocked");
    const withOwner = proc.filter(p=>p.owner).length;
    const pctOwner = proc.length? Math.round(withOwner/proc.length*100):0;
    const active = proc.filter(p=>p.status==="active").length;

    // Hero
    const h = new Date().getHours();
    const saludo = h<12?"Buen día":h<19?"Buenas tardes":"Buenas noches";
    wrap.appendChild(el("div",{class:"hero"},[
      topoLayer(),
      el("div",{class:"h-inner"},[
        el("div",{class:"h-lead"},[
          el("div",{class:"eyebrow"},[ el("span",{class:"d"}), "Sistema vivo · en línea" ]),
          el("h1",{}, saludo+" · "+LO.BRAND.tenant),
          el("p",{}, "Pulso operativo de hoy: qué está vivo, qué espera tu decisión y qué conviene revisar."),
        ]),
        el("div",{class:"h-actions"},[
          el("button",{class:"btn", onclick:()=>LO.Router.go("org")},[icon("org"),"Ver organigrama"]),
          el("button",{class:"btn primary", onclick:()=>openForm("proceso")},[icon("plus"),"Nuevo proceso"]),
        ]),
      ]),
    ]));

    // KPIs con medidor real
    const kpis = el("div",{class:"grid g-4", style:{marginBottom:"18px"}});
    kpis.appendChild(kpiCard("Procesos activos", active, "de "+proc.length+" en el modelo", "process", "var(--ok)", proc.length?active/proc.length:0));
    kpis.appendChild(kpiCard("Aprobaciones pendientes", pendAppr.length, pendAppr.length?"esperan tu decisión":"todo al día", "approval", "var(--info)", pendAppr.length?1:0, true));
    kpis.appendChild(kpiCard("Bloqueos / degradados", blocked.length, "procesos que requieren atención", "alert", "var(--warn)", proc.length?blocked.length/proc.length:0, true));
    kpis.appendChild(kpiCard("Cobertura de owner", pctOwner+"%", "procesos con responsable", "shield", "var(--brand)", pctOwner/100));
    wrap.appendChild(kpis);

    // Mapa de ejecución (firma: lenguaje Humano / IA / Sistema) + Health
    const cols0 = el("div",{class:"grid", style:{gridTemplateColumns:"1.6fr 1fr", marginBottom:"18px"}});
    cols0.appendChild(execMapCard(proc));
    cols0.appendChild(healthCard(proc, conn, sops));
    wrap.appendChild(cols0);

    // Acciones rápidas
    wrap.appendChild(el("div",{class:"section-label"},[ icon("zap"), "Acciones rápidas" ]));
    wrap.appendChild(el("div",{class:"quick", style:{marginBottom:"22px"}},[
      quick("Registrar SOP","sop", ()=>openForm("sop")),
      quick("Crear proceso","process", ()=>openForm("proceso")),
      quick("Nuevo agente","agent", ()=>openForm("agente")),
      quick("Subir conocimiento","knowledge", ()=>openForm("fuente")),
      quick("Conectar herramienta","plug", ()=>openForm("conector")),
    ]));

    // Paneles
    const cols = el("div",{class:"grid", style:{gridTemplateColumns:"1fr 1fr"}});
    cols.appendChild(panel("Esperan tu aprobación", "approval", "var(--info)", pendAppr.slice(0,5).map(a=>({
      title:a.name, sub:(a.requestedBy?("Solicita "+a.requestedBy):"")+(a.due?" · vence "+fmtDate(a.due):""),
      right: a.risk?LO.RISK[a.risk].label:"", dot:(LO.RISK[a.risk]||{}).color, onclick:()=>openDetail("aprobacion",a.id)
    })), "aprobaciones"));
    cols.appendChild(panel("Procesos que requieren atención", "alert", "var(--warn)", blocked.slice(0,5).map(p=>({
      title:p.name, sub:p.owner||"", right:(LO.STATUSES[p.status]||{}).label, dot:(LO.STATUSES[p.status]||{}).color, onclick:()=>openDetail("proceso",p.id)
    })), "procesos"));
    wrap.appendChild(cols);

    const cols2 = el("div",{class:"grid", style:{gridTemplateColumns:"1fr 1fr", marginTop:"16px"}});
    cols2.appendChild(panel("Mi trabajo abierto", "task", "var(--a-h)", tasks.filter(t=>t.status!=="retired").slice(0,5).map(t=>({
      title:t.name, sub:(t.owner||"")+(t.due?" · vence "+fmtDate(t.due):""), right:"", dot:(LO.ACTOR_TYPES[t.actor]||{}).color, onclick:()=>openDetail("tarea",t.id)
    })), "tareas"));
    cols2.appendChild(panel("Integraciones degradadas", "plug", "var(--a-sys)", degraded.slice(0,5).map(c=>({
      title:c.name, sub:c.category||"", right:(LO.STATUSES[c.status]||{}).label, dot:(LO.STATUSES[c.status]||{}).color, onclick:()=>openDetail("conector",c.id)
    })), "conexiones"));
    wrap.appendChild(cols2);

    return wrap;
  }
  function kpiCard(label,val,sub,ic,color,ratio,warnColor){
    const meterColor = color;
    return el("div",{class:"card kpi-card"},[
      el("div",{class:"k-top"},[
        el("div",{class:"k-label"}, label),
        el("div",{class:"kpi-ico", style:{background:color+"18",color:color}}, icon(ic)) ]),
      el("div",{class:"k-val"}, String(val)),
      el("div",{class:"k-sub"}, sub),
      el("div",{class:"k-meter"}, el("i",{style:{width:Math.round(Math.max(0.04,Math.min(1,ratio||0))*100)+"%", background:meterColor}})),
    ]);
  }
  function quick(label, ic, onclick){ return el("div",{class:"qa", onclick},[ el("span",{class:"qi"}, icon(ic)), label ]); }

  function execMapCard(proc){
    const counts={}; Object.keys(LO.ACTOR_TYPES).forEach(k=>counts[k]=0);
    proc.forEach(p=> (p.steps||[]).forEach(s=> { if(counts[s.actor]!=null) counts[s.actor]++; }));
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    const bar = el("div",{class:"em-bar"});
    const legend = el("div",{class:"em-legend"});
    if (total===0){
      bar.appendChild(el("div",{class:"em-empty",style:{padding:"0 8px",color:"#fff",background:"var(--surface-3)",flex:"1",display:"grid",placeItems:"center"}},""));
    }
    Object.keys(LO.ACTOR_TYPES).forEach(k=>{
      const a=LO.ACTOR_TYPES[k], pct= total? counts[k]/total*100 : 0;
      if(pct>0) bar.appendChild(el("div",{class:"seg", style:{width:pct+"%", background:a.color}, title:a.label+": "+counts[k]+" pasos"}, pct>9?Math.round(pct)+"%":""));
      legend.appendChild(el("div",{class:"li"},[ el("span",{class:"sw",style:{background:a.color}}), a.label, el("b",{}, " "+counts[k]) ]));
    });
    return el("div",{class:"card execmap"},[
      el("div",{class:"em-head"},[ icon("layers"), el("b",{style:{fontFamily:"var(--ff-display)",fontSize:"15px"}}, "Mapa de ejecución"),
        el("span",{class:"muted",style:{marginLeft:"auto",fontSize:"12px"}}, total+" pasos declarados") ]),
      total? bar : el("div",{class:"em-empty"},"Aún no defines pasos en tus procesos. Cada paso declara quién ejecuta: Humano, IA o Sistema."),
      legend,
    ]);
  }

  function panel(title, ic, color, items, gotoId){
    const body = items.length ? el("div",{class:"panel-list"}, items.map(it=>
      el("div",{class:"pl-item", onclick:it.onclick},[
        it.dot? el("span",{class:"pl-dot", style:{background:it.dot}}) : el("span",{class:"pl-dot",style:{background:"var(--line)"}}),
        el("div",{class:"pl-main"},[ el("b",{title:it.title}, it.title), it.sub?el("span",{}, it.sub):null ]),
        it.right? el("span",{class:"pl-right"}, it.right):null,
      ]))) : el("div",{class:"panel-ok"},[ icon("checkCircle"), el("div",{}, "Nada por aquí. Todo en orden.") ]);
    return el("div",{class:"card panel"},[
      el("div",{class:"panel-h"},[
        el("span",{class:"pi", style:{background:color+"18", color:color}}, icon(ic)),
        el("h3",{}, title),
        gotoId? el("button",{class:"btn ghost sm more", onclick:()=>LO.Router.go(gotoId)},["Ver todo", icon("chevron")]):null ]),
      body,
    ]);
  }
  function healthCard(proc, conn, sops){
    const doc = proc.length? Math.round(proc.filter(p=>p.sop).length/proc.length*100):0;
    const own = proc.length? Math.round(proc.filter(p=>p.owner).length/proc.length*100):0;
    const sla = proc.length? Math.round(proc.filter(p=>p.sla).length/proc.length*100):0;
    const hc  = conn.length? Math.round(conn.filter(c=>c.status==="active").length/conn.length*100):100;
    const score = Math.round((doc+own+sla+hc)/4);
    const C=2*Math.PI*42, off=C*(1-score/100);
    const grad = score>=75? "var(--ok)" : score>=50? "var(--warn)" : "var(--err)";
    const svg=`<svg viewBox="0 0 100 100" class="ring">
      <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFB259"/><stop offset="1" stop-color="#F5820A"/></linearGradient></defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" stroke-width="9"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#hg)" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 50 50)"/>
      <text x="50" y="49" text-anchor="middle" font-family="Montserrat" font-size="25" font-weight="800" fill="var(--tx)">${score}</text>
      <text x="50" y="63" text-anchor="middle" font-family="Inter" font-size="8" font-weight="600" fill="var(--tx-3)">SALUD</text></svg>`;
    const leg=(label,v,color)=> el("div",{class:"li"},[ el("span",{class:"b",style:{background:color}}), label,
      el("span",{class:"track"}, el("i",{style:{width:v+"%",background:color}})), el("span",{class:"v"}, v+"%") ]);
    return el("div",{class:"card"},[
      el("div",{class:"panel-h"},[ el("span",{class:"pi",style:{background:"var(--brand-soft)",color:"var(--brand)"}}, icon("shield")), el("h3",{},"Health Score del sistema") ]),
      el("div",{class:"health"},[
        el("div",{html:svg}),
        el("div",{class:"h-legend"},[
          leg("Documentación (SOP)", doc, "var(--brand)"),
          leg("Ownership", own, "var(--ok)"),
          leg("SLA definido", sla, "var(--info)"),
          leg("Integraciones sanas", hc, "var(--a-sys)"),
        ]),
      ]),
    ]);
  }

  /* === 9. ORGANIGRAMA VIVO (canvas con arrastre) ======================= */
  const typeMeta={ "Área":{ico:"dept",color:"#0FA3A3"}, "Rol":{ico:"role",color:"#C8862F"},
    "Persona":{ico:"person",color:"#4E7BD6"}, "Agente IA":{ico:"agent",color:"#6D5AE6"} };
  function orgView(){
    const wrap = el("div",{class:"org-wrap"});
    const canvas = el("div",{class:"org-canvas"});
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svgEl.setAttribute("class","org-svg");
    canvas.appendChild(svgEl);

    let scale=1, panX=0, panY=0;
    function apply(){ canvas.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`; canvas.style.transformOrigin="0 0"; }

    const toolbar = el("div",{class:"org-toolbar"},[
      el("button",{class:"btn primary sm", onclick:()=>addNode()},[icon("plus"),"Agregar nodo"]),
      el("div",{class:"sep"}),
      el("button",{class:"btn ghost icon sm", title:"Acercar", onclick:()=>{scale=Math.min(1.6,scale+.15);apply();}}, icon("zin")),
      el("button",{class:"btn ghost icon sm", title:"Alejar", onclick:()=>{scale=Math.max(.5,scale-.15);apply();}}, icon("zout")),
      el("button",{class:"btn ghost icon sm", title:"Reencuadrar", onclick:()=>{scale=1;panX=0;panY=0;apply();}}, icon("reset")),
    ]);
    const legend = el("div",{class:"org-legend"},[
      el("div",{class:"lt"},"Tipos de nodo"),
      ...Object.keys(typeMeta).map(t=> el("div",{class:"li"},[
        el("span",{class:"sw", style:{background:typeMeta[t].color}}, icon(typeMeta[t].ico)), t ])),
    ]);

    wrap.appendChild(canvas);
    wrap.appendChild(toolbar);
    wrap.appendChild(legend);
    wrap.appendChild(el("div",{class:"org-hint"},[ icon("move"), "Arrastra los nodos · clic para ver el contrato · arrastra el fondo para desplazar" ]));

    function drawEdges(){
      const rels=Store.all("relation"); const nodes=Store.all("orgnode");
      const pos={}, typ={}; nodes.forEach(n=>{ pos[n.id]={x:n.x||40,y:n.y||40}; typ[n.id]=n.type; });
      svgEl.innerHTML="";
      rels.forEach(r=>{
        const a=pos[r.from], b=pos[r.to]; if(!a||!b) return;
        const x1=a.x+98, y1=a.y+46, x2=b.x+98, y2=b.y+46;
        const mx=(x1+x2)/2;
        const exec = r.type==="EXECUTES";
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("class","edge"+(exec?" exec":""));
        path.setAttribute("d",`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
        svgEl.appendChild(path);
        const t=document.createElementNS("http://www.w3.org/2000/svg","text");
        t.setAttribute("class","edge-label"); t.setAttribute("x",mx); t.setAttribute("y",(y1+y2)/2-5);
        t.setAttribute("text-anchor","middle"); t.textContent=r.type||"";
        svgEl.appendChild(t);
      });
    }
    function paintNodes(){
      canvas.querySelectorAll(".node").forEach(n=>n.remove());
      const nodes=Store.all("orgnode");
      nodes.forEach(n=>{
        const tm=typeMeta[n.type]||{ico:"org",color:"#6D5AE6"};
        const node=el("div",{class:"node", style:{left:(n.x||40)+"px", top:(n.y||40)+"px"}});
        node.appendChild(el("div",{class:"n-accent", style:{background:tm.color}}));
        const pad=el("div",{class:"n-pad"});
        if (n._live) pad.appendChild(el("span",{class:"n-live"}));
        pad.appendChild(el("div",{class:"n-top"},[
          el("span",{class:"n-ico", style:{background:tm.color}}, icon(tm.ico)),
          el("div",{},[ el("div",{class:"n-type"}, n.type||"Nodo"), el("div",{class:"n-name"}, n.name||"Sin nombre") ]),
        ]));
        if (n.owner) pad.appendChild(el("div",{class:"n-owner"},[ icon("person"), n.owner ]));
        node.appendChild(pad);
        enableDrag(node, n);
        canvas.appendChild(node);
      });
      drawEdges();
    }
    function enableDrag(node, rec){
      let sx,sy,ox,oy,moved=false,drag=false;
      node.addEventListener("pointerdown",e=>{
        if(e.button!==0) return;
        drag=true; moved=false; node.setPointerCapture(e.pointerId); node.classList.add("dragging");
        sx=e.clientX; sy=e.clientY; ox=rec.x||40; oy=rec.y||40;
      });
      node.addEventListener("pointermove",e=>{
        if(!drag) return;
        const dx=(e.clientX-sx)/scale, dy=(e.clientY-sy)/scale;
        if(Math.abs(dx)>3||Math.abs(dy)>3) moved=true;
        rec.x=Math.max(0,ox+dx); rec.y=Math.max(0,oy+dy);
        node.style.left=rec.x+"px"; node.style.top=rec.y+"px"; drawEdges();
      });
      node.addEventListener("pointerup",e=>{
        drag=false; node.classList.remove("dragging");
        if(moved){ Store.upsert("orgnode",{id:rec.id, x:rec.x, y:rec.y}); }
        else { openDetail("orgnode", rec.id); }
      });
    }
    function addNode(){
      const rec=Store.upsert("orgnode",{ name:"Nuevo nodo", type:"Área", status:"draft",
        x: 80+Math.random()*260, y: 80+Math.random()*220 });
      paintNodes(); openForm("orgnode", rec);
    }
    let panning=false,psx,psy,ppx,ppy;
    canvas.parentElement.addEventListener("pointerdown",e=>{
      if(e.target.closest(".node")||e.target.closest(".org-toolbar")||e.target.closest(".org-legend")) return;
      panning=true; psx=e.clientX; psy=e.clientY; ppx=panX; ppy=panY;
    });
    window.addEventListener("pointermove",e=>{ if(!panning)return; panX=ppx+(e.clientX-psx); panY=ppy+(e.clientY-psy); apply(); });
    window.addEventListener("pointerup",()=>panning=false);

    paintNodes(); apply();
    wrap._refresh = paintNodes;
    return wrap;
  }

  /* === 10. ANALÍTICA ==================================================== */
  function analytics(){
    const wrap=el("div",{class:"wrap route-in"});
    const proc=Store.all("proceso"), runs=Store.all("run");
    wrap.appendChild(el("div",{class:"pagehead"},[ el("div",{class:"h-txt"},[
      el("div",{class:"eyebrow"},"Conectar y medir"),
      el("h1",{},"Analítica"), el("p",{},"Métricas de operación. Todo se calcula desde tus datos reales.") ]) ]));

    // Distribución de pasos por tipo de actor (donut + barras)
    const counts={}; Object.keys(LO.ACTOR_TYPES).forEach(k=>counts[k]=0);
    proc.forEach(p=> (p.steps||[]).forEach(s=> { if(counts[s.actor]!=null) counts[s.actor]++; }));
    const totalSteps=Object.values(counts).reduce((a,b)=>a+b,0)||1;

    // donut
    const donutBox=el("div",{class:"card",style:{padding:"20px 22px"}});
    donutBox.appendChild(el("div",{class:"row",style:{marginBottom:"16px"}},[icon("layers"), el("b",{style:{fontFamily:"var(--ff-display)",fontSize:"15px"}},"Ejecución por tipo de actor")]));
    let acc=0; const R=54, C=2*Math.PI*R; let segs="";
    Object.keys(LO.ACTOR_TYPES).forEach(k=>{
      const a=LO.ACTOR_TYPES[k], frac=counts[k]/totalSteps;
      if(frac>0){ const len=frac*C; segs+=`<circle cx="75" cy="75" r="${R}" fill="none" stroke="${a.color}" stroke-width="18"
        stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-acc*C}" transform="rotate(-90 75 75)"/>`; acc+=frac; }
    });
    const donut=`<svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="18"/>${segs}
      <text x="75" y="72" text-anchor="middle" font-family="Montserrat" font-size="26" font-weight="800" fill="var(--tx)">${Object.values(counts).reduce((a,b)=>a+b,0)}</text>
      <text x="75" y="90" text-anchor="middle" font-family="Inter" font-size="9" font-weight="600" fill="var(--tx-3)">PASOS</text></svg>`;
    const legend=el("div",{style:{flex:"1",display:"grid",gap:"9px"}});
    Object.keys(LO.ACTOR_TYPES).forEach(k=>{
      const a=LO.ACTOR_TYPES[k], pct=Math.round(counts[k]/totalSteps*100);
      legend.appendChild(el("div",{class:"row between",style:{fontSize:"13px"}},[
        el("span",{class:"row"},[ el("span",{class:"swatch",style:{width:"11px",height:"11px",borderRadius:"3px",background:a.color,display:"inline-block"}}), a.label ]),
        el("b",{class:"mono",style:{fontSize:"12px"}}, counts[k]+" · "+pct+"%") ]));
    });
    donutBox.appendChild(el("div",{class:"donut-wrap"},[ el("div",{html:donut}), legend ]));

    // Procesos por estado
    const stBox=el("div",{class:"card",style:{padding:"20px 22px"}});
    stBox.appendChild(el("div",{class:"row",style:{marginBottom:"14px"}},[icon("process"), el("b",{style:{fontFamily:"var(--ff-display)",fontSize:"15px"}},"Procesos por estado")]));
    const byStatus={}; proc.forEach(p=> byStatus[p.status]=(byStatus[p.status]||0)+1);
    const maxSt=Math.max(1,...Object.values(byStatus));
    let anySt=false;
    Object.keys(LO.STATUSES).forEach(k=>{ if(!byStatus[k])return; anySt=true;
      const s=LO.STATUSES[k];
      stBox.appendChild(el("div",{class:"bar-row"},[
        el("div",{class:"br-top"},[ el("span",{class:"lbl"},[ statusBadge(k) ]), el("b",{}, byStatus[k]) ]),
        el("div",{class:"track"}, el("i",{style:{width:Math.round(byStatus[k]/maxSt*100)+"%", background:s.color}})),
      ])); });
    if(!anySt) stBox.appendChild(el("div",{class:"muted",style:{padding:"6px 0"}},"Aún no hay procesos con estado."));

    const g=el("div",{class:"grid g-2"}); g.appendChild(donutBox); g.appendChild(stBox);
    wrap.appendChild(g);

    const cards=el("div",{class:"grid g-4",style:{marginTop:"18px"}});
    cards.appendChild(kpiCard("Procesos", proc.length, "totales en el modelo","process","var(--brand)", 1));
    cards.appendChild(kpiCard("Runs registrados", runs.length, "instancias de ejecución","run","var(--warn)", 1));
    cards.appendChild(kpiCard("SOPs", Store.all("sop").length, "procedimientos vivos","sop","var(--info)", 1));
    cards.appendChild(kpiCard("Agentes", Store.all("agente").length, "actores de IA gobernados","agent","var(--a-ai)", 1));
    wrap.appendChild(cards);
    return wrap;
  }

  /* === 11. COMMAND PALETTE ============================================= */
  const palette = el("div",{class:"palette"}); document.body.appendChild(palette);
  function openPalette(){
    const results=el("div",{class:"presults"});
    const input=el("input",{placeholder:"Buscar procesos, SOPs, agentes… o ir a un módulo", oninput:()=>run()});
    palette.innerHTML=""; palette.appendChild(el("div",{class:"pbox"},[
      el("div",{class:"psearch"},[ icon("search"), input ]), results ]));
    function run(){
      const q=input.value.toLowerCase(); results.innerHTML="";
      const navItems=[]; LO.NAV.forEach(g=>g.items.forEach(i=>navItems.push(i)));
      const navMatch=navItems.filter(i=> !q || i.label.toLowerCase().includes(q));
      if(navMatch.length){ results.appendChild(el("div",{class:"pgroup"},"Ir a"));
        navMatch.slice(0,6).forEach(i=> results.appendChild(prow(i.icon,"var(--ink)",i.label,"Módulo",()=>{closePalette();LO.Router.go(i.id);}))); }
      if(q){
        Object.keys(LO.ENTITIES).forEach(ek=>{ const def=LO.ENTITIES[ek];
          const hits=Store.all(ek).filter(r=> (r.name||r.title||"").toLowerCase().includes(q)).slice(0,4);
          if(hits.length){ results.appendChild(el("div",{class:"pgroup"}, def.plural));
            hits.forEach(r=> results.appendChild(prow(def.icon,def.color, r.name||r.title, def.label, ()=>{closePalette();openDetail(ek,r.id);}))); }
        });
      }
      if(!results.children.length) results.appendChild(el("div",{class:"empty",style:{padding:"30px"}},[el("p",{},"Sin resultados para “"+q+"”.")]));
    }
    function prow(ic,color,title,sub,onclick){ return el("div",{class:"pr", onclick},[
      el("span",{class:"pr-ico",style:{background:color}}, icon(ic)),
      el("div",{},[ el("div",{class:"pr-t"}, title), el("div",{class:"pr-s"}, sub) ]),
      el("span",{class:"pr-k"},"↵") ]); }
    run();
    requestAnimationFrame(()=>palette.classList.add("show"));
    setTimeout(()=>input.focus(),60);
  }
  function closePalette(){ palette.classList.remove("show"); }
  palette.addEventListener("click",e=>{ if(e.target===palette) closePalette(); });

  /* === TEMA (claro / oscuro) ========================================== */
  function getTheme(){ try{ return localStorage.getItem("lo.theme")||"light"; }catch(e){ return "light"; } }
  function applyTheme(t){
    const theme = t==="dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    try{ localStorage.setItem("lo.theme", theme); }catch(e){}
    const b=document.getElementById("theme");
    if(b){ b.innerHTML=""; b.appendChild(icon(theme==="dark"?"palette":"moon")); b.title = theme==="dark"?"Tema claro":"Tema oscuro"; }
  }
  function toggleTheme(){ applyTheme(getTheme()==="dark"?"light":"dark"); }

  /* === 12. ROUTER + SHELL + BOOT ======================================= */
  const Router = {
    current:null,
    go(id){ location.hash="#/"+id; },
    render(){
      const id=(location.hash.replace("#/","")||"home");
      const item = flatNav().find(i=>i.id===id) || flatNav()[0];
      this.current=item;
      document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active", n.dataset.id===item.id));
      // crumb: grupo › módulo
      let grp=""; LO.NAV.forEach(g=>g.items.forEach(i=>{ if(i.id===item.id) grp=g.group; }));
      const crumb=document.getElementById("crumb");
      crumb.innerHTML="";
      crumb.appendChild(el("span",{class:"home"}, icon("home")));
      crumb.appendChild(el("span",{class:"sep"},"/"));
      if(grp){ crumb.appendChild(el("span",{class:"muted",style:{fontSize:"13px"}}, grp)); crumb.appendChild(el("span",{class:"sep"},"/")); }
      crumb.appendChild(el("span",{class:"cur"}, item.label));

      let node;
      if (item.view==="dashboard") node=dashboard();
      else if (item.view==="org") node=orgView();
      else if (item.view==="analytics") node=analytics();
      else node=listView(item.entity);
      const host=document.getElementById("view"); host.innerHTML=""; host.appendChild(node);
      host.scrollTop=0; this._active=node;
      updateBell();
    },
    refresh(){ if(this._active && this._active._refresh) this._active._refresh();
      else if (this.current && (this.current.view==="dashboard"||this.current.view==="analytics"||this.current.view==="org")) this.render();
      // refresca contadores del nav
      document.querySelectorAll(".nav-item").forEach(n=>{ const c=n.querySelector(".count"); const ent=n.dataset.entity;
        if(c && ent) c.textContent=Store.all(ent).length; });
      updateBell();
    },
  };
  LO.Router=Router;
  function flatNav(){ const a=[]; LO.NAV.forEach(g=>g.items.forEach(i=>a.push(i))); return a; }

  function updateBell(){
    const bell=document.getElementById("bell"); if(!bell) return;
    const n=Store.all("aprobacion").filter(a=>(a.status||"Pendiente")==="Pendiente").length;
    let dot=bell.querySelector(".dot");
    if(n>0){ if(!dot){ dot=el("span",{class:"dot"}); bell.appendChild(dot);} dot.textContent=n; }
    else if(dot){ dot.remove(); }
  }

  /* Persistencia de la barra lateral (contraída/expandida) entre sesiones. */
  function getSidebarCollapsed(){ try{ return localStorage.getItem("lo.sidebar.collapsed")==="1"; }catch(e){ return false; } }
  function setSidebarCollapsed(v){ try{ localStorage.setItem("lo.sidebar.collapsed", v?"1":"0"); }catch(e){} }
  function toggleSidebar(){
    const app=document.getElementById("app");
    const collapsed = app.classList.toggle("collapsed");
    setSidebarCollapsed(collapsed);
    const btn=document.getElementById("sidebar-collapse-btn");
    if(btn){ btn.setAttribute("aria-expanded", collapsed?"false":"true");
      btn.setAttribute("aria-label", collapsed?"Expandir menú":"Contraer menú"); }
  }

  /* MOV-01: sidebar off-canvas en móvil (independiente del colapso a ícono
   * de escritorio) — botón hamburguesa + scrim, igual patrón que el portal
   * ERPNext. */
  let mobileScrim;
  function closeMobileNav(){
    document.querySelector(".sidebar")?.classList.remove("mobile-open");
    mobileScrim?.classList.remove("show");
  }
  function openMobileNav(){
    document.querySelector(".sidebar")?.classList.add("mobile-open");
    mobileScrim?.classList.add("show");
  }

  function buildShell(){
    const app=document.getElementById("app");
    if (getSidebarCollapsed()) app.classList.add("collapsed");
    const nav=el("nav",{class:"nav"});
    LO.NAV.forEach(g=>{
      const grp=el("div",{class:"nav-group"},[ el("div",{class:"g-title"}, g.group) ]);
      g.items.forEach(i=>{
        const count = i.entity? Store.all(i.entity).length : "";
        const item=el("div",{class:"nav-item","data-id":i.id,"data-entity":i.entity||"",
          title:i.label, "aria-label":i.label, role:"button", tabindex:"0",
          onclick:()=>{ Router.go(i.id); closeMobileNav(); },
          onkeydown:e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); Router.go(i.id); closeMobileNav(); } }},[
          icon(i.icon), el("span",{class:"txt"}, i.label),
          i.entity? el("span",{class:"count"}, count):null ]);
        grp.appendChild(item);
      });
      nav.appendChild(grp);
    });
    const sidebar=el("aside",{class:"sidebar"},[
      el("div",{class:"brand"},[
        el("div",{class:"mark", html:markSVG()}),
        el("div",{class:"txt"},[
          el("div",{class:"name"},[ LO.BRAND.name, el("span",{}, LO.BRAND.suffix) ]),
          el("div",{class:"tag"}, LO.BRAND.tagline),
        ]),
      ]),
      nav,
      topoLayer(),
      el("div",{class:"side-foot"},[
        el("div",{class:"side-user", title:LO.BRAND.tenant},[
          el("div",{class:"av"}, "GA"),
          el("div",{class:"su-txt"},[ el("b",{}, LO.BRAND.tenant), el("span",{}, LO.BRAND.workspaces[0]) ]),
        ]),
        el("button",{class:"collapse-btn", id:"sidebar-collapse-btn", type:"button",
          "aria-label": getSidebarCollapsed()?"Expandir menú":"Contraer menú",
          "aria-expanded": getSidebarCollapsed()?"false":"true",
          onclick:()=>toggleSidebar()},[ icon("chevL"), el("span",{class:"txt"},"Contraer menú") ]),
      ]),
    ]);

    // Topbar
    const themeBtn=el("button",{class:"top-btn", id:"theme", title:"Cambiar tema", onclick:toggleTheme}, icon("moon"));
    const bellBtn=el("button",{class:"top-btn", id:"bell", title:"Aprobaciones pendientes",
      onclick:()=>Router.go("aprobaciones")}, icon("bell"));
    const wsBtn=el("div",{class:"ws-pick", title:"Cambiar workspace"},[ el("span",{class:"dot"}),
      el("span",{class:"ws-label"}, LO.BRAND.workspaces[0]), icon("chevD") ]);
    wsBtn.addEventListener("click",()=>{
      menu(wsBtn,{ align:"right", items:[
        {header:"Workspaces"},
        ...LO.BRAND.workspaces.map((w,idx)=>({label:w, icon:"layers", color:idx===0?"var(--brand)":"var(--a-sys)",
          on: wsBtn.querySelector(".ws-label").textContent===w,
          onClick:()=>{ wsBtn.querySelector(".ws-label").textContent=w; toast("Workspace: "+w); }})),
      ]});
    });
    const addBtn=el("button",{class:"btn primary", title:"Crear nuevo"},[ icon("plus"), el("span",{class:"txt"},"Nuevo") ]);
    addBtn.addEventListener("click",()=>{
      menu(addBtn,{ align:"right", items:[
        {header:"Crear rápido"},
        {label:"Proceso", icon:"process", color:LO.ENTITIES.proceso.color, onClick:()=>openForm("proceso")},
        {label:"SOP", icon:"sop", color:LO.ENTITIES.sop.color, onClick:()=>openForm("sop")},
        {label:"Agente IA", icon:"agent", color:LO.ENTITIES.agente.color, onClick:()=>openForm("agente")},
        {label:"Fuente de conocimiento", icon:"knowledge", color:LO.ENTITIES.fuente.color, onClick:()=>openForm("fuente")},
        {label:"Tarea", icon:"task", color:LO.ENTITIES.tarea.color, onClick:()=>openForm("tarea")},
        {sep:true},
        {label:"Conector", icon:"plug", color:LO.ENTITIES.conector.color, onClick:()=>openForm("conector")},
      ]});
    });
    const avatar=el("div",{class:"avatar", title:"Cuenta"}, "GA");
    avatar.addEventListener("click",()=>{
      menu(avatar,{ align:"right", items:[
        {header:LO.BRAND.tenant},
        {label:"Reiniciar datos demo", icon:"reset", color:"var(--warn)", onClick:()=>{
          if(confirm("¿Reiniciar todos los datos a la semilla demo? Se perderán tus cambios locales.")){ Store.reset(); Router.render(); toast("Datos demo restaurados"); } }},
        {label:"Buscar en todo", icon:"search", color:"var(--ink)", right:"⌘K", onClick:openPalette},
      ]});
    });

    const mobileMenuBtn=el("button",{class:"top-btn mobile-menu-btn", title:"Abrir menú", "aria-label":"Abrir menú", onclick:openMobileNav}, icon("list"));
    mobileScrim=el("div",{class:"mobile-scrim", onclick:closeMobileNav});
    app.appendChild(mobileScrim);

    const topbar=el("header",{class:"topbar"},[
      mobileMenuBtn,
      el("div",{class:"crumb", id:"crumb"}),
      el("div",{class:"top-spacer"}),
      el("div",{class:"search", onclick:openPalette},[ icon("search"), el("span",{class:"lbl"},"Buscar en todo…"), el("span",{class:"kbd"},"⌘K") ]),
      addBtn,
      themeBtn,
      bellBtn,
      wsBtn,
      avatar,
    ]);

    const main=el("main",{class:"main"},[ topbar, el("div",{class:"view", id:"view"}) ]);
    app.appendChild(sidebar); app.appendChild(main);
  }

  function boot(){
    load();
    buildShell();
    applyTheme(getTheme());
    Router.render();
    window.addEventListener("hashchange",()=>Router.render());
    window.addEventListener("keydown",e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); openPalette(); }
      if(e.key==="Escape"){ closePalette(); closeModal(); closeDrawer(); closeMenu(); }
    });
  }
  window.addEventListener("DOMContentLoaded", boot);

  /* === SEMILLA DE DATOS (demo en español, mundo Altoplano) ============= */
  function seed(){
    const db={};
    const P=(o)=>({_created:Date.now()-Math.floor(Math.random()*1e7),...o});
    db.orgnode=[
      P({id:"on_dir", name:"Dirección General", type:"Área", owner:"Dirección", status:"active", x:430, y:40, _live:true,
         mission:"Definir rumbo y prioridades de Grupo Altoplano." }),
      P({id:"on_com", name:"Comercial", type:"Área", owner:"Gerencia Comercial", status:"active", x:150, y:210, _live:true,
         mission:"Generar y cerrar oportunidades en Mérida y Orange County.", kpis:["Cierre %","Ciclo de venta"], tools:["ERPNext","HubSpot"] }),
      P({id:"on_ops", name:"Operaciones / Implementación", type:"Área", owner:"PMO", status:"active", x:430, y:240,
         mission:"Implementar ERPNext y software Moorty en clientes." }),
      P({id:"on_tec", name:"Tecnología", type:"Área", owner:"CTO", status:"active", x:720, y:210,
         mission:"Plataforma, automatización e integraciones." }),
      P({id:"on_rolvend", name:"Ejecutivo Comercial", type:"Rol", owner:"Vendedores", status:"active", x:60, y:400 }),
      P({id:"on_persana", name:"Liliana Reyes", type:"Persona", owner:"Cuenta inmobiliaria", status:"active", x:250, y:400 }),
      P({id:"on_agcalif", name:"Agente de Calificación", type:"Agente IA", owner:"Gerencia Comercial", status:"pilot", x:60, y:520, _live:true,
         mission:"Califica leads entrantes y explica el motivo.", tools:["CRM (lectura)"] }),
      P({id:"on_agprop", name:"Agente Redactor de Propuestas", type:"Agente IA", owner:"Gerencia Comercial", status:"pilot", x:470, y:430 }),
    ];
    db.relation=[
      P({id:"r1", from:"on_dir", to:"on_com", type:"REPORTS_TO"}),
      P({id:"r2", from:"on_dir", to:"on_ops", type:"REPORTS_TO"}),
      P({id:"r3", from:"on_dir", to:"on_tec", type:"REPORTS_TO"}),
      P({id:"r4", from:"on_com", to:"on_rolvend", type:"OWNS"}),
      P({id:"r5", from:"on_com", to:"on_agcalif", type:"EXECUTES"}),
      P({id:"r6", from:"on_ops", to:"on_agprop", type:"EXECUTES"}),
    ];
    db.sop=[
      P({id:"sop_calif", name:"Calificación de oportunidad comercial", owner:"Gerencia Comercial", status:"active", version:"v1.4", author:"Comercial",
        objective:"Determinar si una oportunidad entrante es viable y priorizarla con criterios uniformes.",
        scope:"Aplica a leads de formularios, WhatsApp y referidos. No aplica a soporte de clientes actuales.",
        trigger:"Se crea un lead nuevo en el CRM.",
        inputs:"Datos de contacto, giro, tamaño, necesidad declarada, fuente.",
        roles:"Owner: Gerencia Comercial. Ejecuta: Ejecutivo Comercial + Agente de Calificación (H+IA). Aprueba: Gerencia si es alto valor.",
        tools:["ERPNext","HubSpot","WhatsApp Business"],
        procedure:"1. Normalizar y deduplicar el lead.\n2. Calcular score con reglas y contexto comercial.\n3. Si es alto valor o faltan datos → revisión humana.\n4. Registrar decisión y siguiente acción en el CRM.",
        dod:"El lead queda con score, segmento y siguiente acción asignada.",
        evidence:"Registro CRM actualizado + JSON de calificación.",
        exceptions:"Lead sin datos suficientes → tarea humana de enriquecimiento.",
        controls:"El agente solo tiene lectura del CRM. Alto valor con datos incompletos siempre escala.",
        metrics:"SLA 4 h hábiles · % de leads calificados en primer contacto · tasa de excepción." }),
      P({id:"sop_cotiza", name:"Emisión de cotización", owner:"Operaciones", status:"pilot", version:"v0.9", author:"PMO",
        objective:"Generar y enviar una cotización correcta con precios y condiciones vigentes.",
        scope:"Servicios de implementación y suscripciones Moorty.",
        procedure:"1. Confirmar alcance con el cliente.\n2. Cargar partidas y precios vigentes.\n3. Revisión de descuento contra política.\n4. Generar documento y enviar por el canal acordado.",
        tools:["ERPNext"], dod:"Cotización enviada y registrada con folio.",
        evidence:"Folio de cotización + estado de entrega." }),
    ];
    db.proceso=[
      P({id:"pr_lead", name:"Lead → Calificación → Cotización → Seguimiento", owner:"Gerencia Comercial", status:"active", risk:"medium", autonomy:"L2",
        purpose:"Convertir un lead entrante en una cotización enviada, con seguimiento hasta respuesta.",
        clients:"Prospectos de Mérida y Orange County.", trigger:"Webhook de formulario o alta manual.",
        inputs:"Lead, catálogo, reglas de precio.", outputs:"Cotización enviada + evidencia.",
        exceptions:"Sin respuesta o excepción de precio → escala al vendedor.",
        sla:"Draft de propuesta el mismo día.", tools:["ERPNext","HubSpot","Generador de documentos"], kpis:["Cierre %","Ciclo de venta"], sop:"sop_calif",
        steps:[
          {name:"Entrada de lead", actor:"SYS"},
          {name:"Normalizar y deduplicar", actor:"AI"},
          {name:"Calificar", actor:"AI"},
          {name:"Gate de riesgo", actor:"SYS"},
          {name:"Revisión de calificación", actor:"H+AI"},
          {name:"Preparar propuesta", actor:"AI->H"},
          {name:"Aprobar términos", actor:"H"},
          {name:"Crear / enviar cotización", actor:"SYS"},
          {name:"Follow-up", actor:"AI"},
          {name:"Escalación", actor:"H"},
        ]}),
      P({id:"pr_impl", name:"Onboarding de cliente ERPNext", owner:"PMO", status:"degraded", risk:"high", autonomy:"L1",
        purpose:"Implementar ERPNext en un cliente nuevo dejando el sistema operativo y documentado.",
        trigger:"Contrato firmado.", sla:"6 semanas", tools:["ERPNext","Google Drive"],
        steps:[{name:"Kickoff",actor:"H"},{name:"Migración de datos",actor:"SYS"},{name:"Configuración",actor:"H"},{name:"Capacitación",actor:"H"},{name:"Go-live",actor:"H"}]}),
      P({id:"pr_gas", name:"Corte diario de estación de gas", owner:"Operaciones", status:"active", risk:"medium", autonomy:"L3",
        purpose:"Conciliar ventas, inventario y efectivo de la estación al cierre del día.",
        trigger:"Fin de turno / schedule 23:00.", sla:"30 min", tools:["ERPNext","POS"],
        steps:[{name:"Cerrar turnos",actor:"SYS"},{name:"Conciliar inventario",actor:"AI"},{name:"Revisar diferencias",actor:"H+AI"},{name:"Registrar corte",actor:"SYS"}]}),
    ];
    db.agente=[
      P({id:"ag_calif", name:"Agente de Calificación", dept:"Comercial", owner:"Gerencia Comercial", status:"pilot", autonomy:"L2",
        purpose:"Clasifica la oportunidad y explica el motivo. No inventa datos; si faltan campos críticos devuelve NEEDS_HUMAN.",
        skills:["Scoring de leads","Deduplicación"], tools:["CRM (lectura)"], knowledge:["Política comercial"],
        budget:"8k tokens / run", escalation:"Escala a Gerencia si es alto valor con datos incompletos.",
        outputSchema:'{ "score": 0-100, "segmento": "", "razones": [], "faltantes": [], "siguiente_accion": "", "requiere_humano": true }' }),
      P({id:"ag_prop", name:"Agente Redactor de Propuestas", dept:"Comercial", owner:"Gerencia Comercial", status:"pilot", autonomy:"L2",
        purpose:"Redacta alcance y cotización preliminar a partir del lead y las reglas de precio.",
        tools:["CRM (lectura)","Pricing (lectura)","Generador de documentos"], budget:"12k tokens / run",
        escalation:"Aprobación obligatoria si el descuento supera la política." }),
    ];
    db.prompt=[
      P({id:"pm_calif", name:"proposal-draft", version:"v1.4", status:"Approved", owner:"Comercial",
        system:"ROL: Eres Analista de Calificación. Reglas: no inventes datos; sé conservador con datos incompletos.",
        task:"Clasifica la oportunidad {{lead}} usando {{historial}} y {{politica_comercial}}.",
        context:"Se inyecta: política comercial vigente, historial del contacto.",
        output:'{ "score": number, "segmento": string, "razones": string[], "faltantes": string[], "siguiente_accion": string, "requiere_humano": boolean }',
        toolPolicy:"Solo lectura de CRM.", fallback:"Si faltan campos críticos → NEEDS_HUMAN." }),
    ];
    db.fuente=[
      P({id:"kn_pol", name:"Política comercial 2026", area:"Comercial", owner:"Dirección", sensitivity:"Interna", status:"active",
        tags:["precios","descuentos"], summary:"Reglas de precio, descuentos permitidos y condiciones de pago.",
        validUntil:"2026-12-31" }),
      P({id:"kn_cat", name:"Catálogo de servicios Altoplano", area:"Comercial", owner:"Comercial", sensitivity:"Pública", status:"active",
        tags:["ERPNext","Moorty"], summary:"Servicios de consultoría y suscripciones de software." }),
    ];
    db.run=[
      P({id:"rn1", name:"Run · Lead #4821", process:"pr_lead", status:"waiting", startedAt:new Date().toISOString().slice(0,10), owner:"Agente de Calificación",
        notes:"Esperando aprobación de términos por descuento fuera de política." }),
      P({id:"rn2", name:"Run · Corte 29-ago", process:"pr_gas", status:"active", startedAt:new Date().toISOString().slice(0,10), owner:"Sistema" }),
    ];
    db.tarea=[
      P({id:"tk1", name:"Aprobar términos de propuesta · Lead #4821", actor:"H", status:"waiting", owner:"Gerencia Comercial", process:"pr_lead",
        due:new Date(Date.now()+864e5).toISOString().slice(0,10), instructions:"Revisar precio y descuento contra la política antes de enviar." }),
      P({id:"tk2", name:"Enriquecer datos de lead sin teléfono", actor:"H+AI", status:"active", owner:"Ejecutivo Comercial",
        due:new Date().toISOString().slice(0,10) }),
    ];
    db.aprobacion=[
      P({id:"ap1", name:"Descuento 18% en propuesta · Lead #4821", requestedBy:"Agente Redactor", approver:"Gerencia Comercial",
        process:"pr_lead", risk:"high", status:"Pendiente", due:new Date(Date.now()+864e5).toISOString().slice(0,10),
        context:"El descuento supera la política (máx 12%). Cliente estratégico en Orange County." }),
      P({id:"ap2", name:"Publicar v2 del proceso de corte de gas", requestedBy:"PMO", approver:"Dirección",
        process:"pr_gas", risk:"medium", status:"Pendiente", due:new Date(Date.now()+3*864e5).toISOString().slice(0,10) }),
    ];
    db.conector=[
      P({id:"cn_erp", name:"ERPNext (producción)", category:"CRM / ERP", status:"active", auth:"OAuth", lastSync:new Date().toISOString().slice(0,10),
        scopes:["leer clientes","crear oportunidad","crear factura"], depends:["Lead → Cotización","Corte de gas"] }),
      P({id:"cn_hub", name:"HubSpot", category:"CRM / ERP", status:"degraded", auth:"API key", lastSync:new Date(Date.now()-3*864e5).toISOString().slice(0,10),
        scopes:["leer contactos"], depends:["Lead → Cotización"], notes:"Token próximo a expirar; renovar." }),
      P({id:"cn_wa", name:"WhatsApp Business", category:"Comunicación", status:"active", auth:"OAuth", lastSync:new Date().toISOString().slice(0,10) }),
      P({id:"cn_drv", name:"Google Drive", category:"Documentos", status:"active", auth:"OAuth", lastSync:new Date().toISOString().slice(0,10) }),
    ];
    db.politica=[
      P({id:"po_desc", name:"Aprobación de descuentos", scope:"Comercial", status:"active",
        rules:"Descuento > 12% requiere aprobación humana de Gerencia. Acciones financieras siempre con gate." }),
      P({id:"po_ai", name:"Autonomía base de IA", scope:"Global", status:"active",
        rules:"Ningún agente ejecuta acciones irreversibles sin aprobación. Los agentes inician en lectura." }),
    ];
    db.kpi=[];
    return db;
  }

})();
