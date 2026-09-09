(() => {
  "use strict";

  const STORAGE_KEY = "livingorg.flow-studio.v4";
  const LIBRARY_KEY = "livingorg.library.v4";
  const SCENE_WIDTH = 1500;
  const SCENE_HEIGHT = 1320;
  const NODE_WIDTH = 228;

  const NODE_TYPES = {
    start: { label: "Inicio", group: "Básicos", color: "var(--lo-success)", colorValue: "#1F9D6B", icon: "▶", actor: "SYS", description: "Evento que inicia el proceso" },
    task: { label: "Actividad", group: "Básicos", color: "var(--lo-brand)", colorValue: "#F26B1F", icon: "✓", actor: "H", description: "Acción ejecutada por una persona" },
    decision: { label: "Decisión", group: "Básicos", color: "var(--lo-decision)", colorValue: "#D84C4C", icon: "?", actor: "SYS", description: "Pregunta que divide el flujo" },
    end: { label: "Fin", group: "Básicos", color: "var(--lo-success)", colorValue: "#1F9D6B", icon: "■", actor: "SYS", description: "Resultado final del proceso" },
    human: { label: "Persona / rol", group: "Roles y organización", color: "var(--lo-human)", colorValue: "#C8862F", icon: "●", actor: "H", description: "Responsable humano del proceso" },
    area: { label: "Área", group: "Roles y organización", color: "var(--lo-human)", colorValue: "#C8862F", icon: "▦", actor: "H", description: "Departamento o unidad responsable" },
    system: { label: "Sistema", group: "Sistemas e inteligencia", color: "var(--lo-system)", colorValue: "#2E8FB0", icon: "▣", actor: "SYS", description: "Sistema o integración utilizada" },
    ai: { label: "Agente IA", group: "Sistemas e inteligencia", color: "var(--lo-ai)", colorValue: "#6D5AE6", icon: "✦", actor: "AI", description: "Actividad ejecutada por inteligencia artificial" },
    document: { label: "Documento", group: "Información", color: "var(--lo-document)", colorValue: "#B47A25", icon: "▤", actor: "SYS", description: "Entrada, salida o evidencia documental" },
    note: { label: "Nota", group: "Información", color: "var(--lo-text-3)", colorValue: "#8D96A5", icon: "✎", actor: "H", description: "Contexto o aclaración del proceso" }
  };

  const INITIAL_STATE = {
    schema: 4,
    process: {
      id: "pr_lead",
      code: "PROC-COM-001",
      title: "Lead → Calificación → Cotización → Seguimiento",
      owner: "Gerencia Comercial",
      status: "Activo",
      version: "v1.4",
      purpose: "Convertir un lead entrante en una cotización enviada, con seguimiento hasta respuesta.",
      outcome: "Cotización correcta enviada, registrada y con siguiente acción definida.",
      area: "Comercial"
    },
    nodes: [
      { id: "n_start", type: "start", title: "Inicio", actor: "SYS", owner: "CRM", system: "Webhook de formulario", x: 636, y: 70 },
      { id: "n_lead", type: "task", title: "Entrada de lead", actor: "SYS", owner: "CRM", system: "ERPNext · Lead", x: 636, y: 220, evidence: "Lead creado", xcolor: "#F26B1F" },
      { id: "n_normalize", type: "system", title: "Normalizar y deduplicar", actor: "AI", owner: "Agente de Calificación", system: "CRM", x: 636, y: 370, evidence: "Registro normalizado" },
      { id: "n_qualify", type: "ai", title: "Calificar", actor: "AI", owner: "Agente de Calificación", system: "Scoring de leads", x: 636, y: 520, evidence: "Score + razones" },
      { id: "n_gate", type: "decision", title: "¿Alto valor?", actor: "SYS", owner: "Reglas comerciales", system: "Gate de riesgo", x: 636, y: 670, instructions: "Si el lead es de alto valor, requiere revisión humana." },
      { id: "n_human", type: "human", title: "Revisión humana", actor: "H", owner: "Gerencia Comercial", system: "ERPNext", x: 250, y: 850, evidence: "Decisión aprobada" },
      { id: "n_quote", type: "system", title: "Crear cotización", actor: "SYS", owner: "Operaciones", system: "ERPNext · Quotation", x: 1022, y: 850, evidence: "Folio de cotización" },
      { id: "n_end", type: "end", title: "Fin", actor: "SYS", owner: "CRM", system: "Siguiente acción definida", x: 1022, y: 1010 }
    ],
    edges: [
      { id: "e1", from: "n_start", to: "n_lead", label: "siguiente" },
      { id: "e2", from: "n_lead", to: "n_normalize", label: "captura" },
      { id: "e3", from: "n_normalize", to: "n_qualify", label: "normalizado" },
      { id: "e4", from: "n_qualify", to: "n_gate", label: "evalúa" },
      { id: "e5", from: "n_gate", to: "n_human", label: "No", branch: true },
      { id: "e6", from: "n_gate", to: "n_quote", label: "Sí", branch: true },
      { id: "e7", from: "n_quote", to: "n_end", label: "enviado" }
    ],
    viewport: { zoom: 1, panX: 0, panY: 0 },
    grid: true
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  let state = loadState();
  let selectedNodeId = null;
  let mode = "select";
  let connectingSourceId = null;
  let history = [];
  let historyIndex = -1;
  let saveTimer = null;
  let nodeDrag = null;
  let panDrag = null;
  let paletteQuery = "";
  let toastTimer = null;

  const shell = $("#appShell");
  const flowEditor = $("#flowEditor");
  const moduleView = $("#moduleView");
  const canvasViewport = $("#canvasViewport");
  const graphScene = $("#graphScene");
  const nodesLayer = $("#nodesLayer");
  const edgeLayer = $("#edgeLayer");
  const inspectorPanel = $("#inspectorPanel");
  const inspectorBody = $("#inspectorBody");
  const inspectorFooter = $("#inspectorFooter");
  const nodePalette = $("#nodePalette");
  const organizeMenu = $("#organizeMenu");
  const moreMenu = $("#moreMenu");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(INITIAL_STATE);
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schema !== 4 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return clone(INITIAL_STATE);
      return parsed;
    } catch (error) {
      return clone(INITIAL_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
    }
  }

  function scheduleSave() {
    setSaveState("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 950);
  }

  function setSaveState(status) {
    const node = $("#saveState");
    if (!node) return;
    node.classList.toggle("is-saving", status === "saving");
    node.classList.toggle("is-error", status === "error");
    node.innerHTML = status === "saving" ? "<i></i> Guardando…" : status === "error" ? "<i></i> Error al guardar" : "<i></i> Guardado";
  }

  function snapshot() {
    return clone(state);
  }

  function commit(label = "Cambio") {
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot());
    historyIndex = history.length - 1;
    scheduleSave();
    updateStatus(label);
    renderAll();
  }

  function undo() {
    if (historyIndex <= 0) return toast("No hay cambios anteriores.");
    historyIndex -= 1;
    state = clone(history[historyIndex]);
    scheduleSave();
    renderAll();
    toast("Cambio deshecho");
  }

  function redo() {
    if (historyIndex >= history.length - 1) return toast("No hay cambios posteriores.");
    historyIndex += 1;
    state = clone(history[historyIndex]);
    scheduleSave();
    renderAll();
    toast("Cambio recuperado");
  }

  function nodeMeta(node) {
    return NODE_TYPES[node.type] || NODE_TYPES.task;
  }

  function nodeHeight(node) {
    if (node.type === "start" || node.type === "end") return 76;
    if (node.type === "decision") return 108;
    return 96;
  }

  function getNode(id) {
    return state.nodes.find(node => node.id === id);
  }

  function getEdgeEndpoint(id, direction) {
    const edge = state.edges.find(item => item.id === id);
    if (!edge) return null;
    return getNode(direction === "from" ? edge.from : edge.to);
  }

  function setMode(nextMode) {
    mode = nextMode;
    if (nextMode !== "connect") connectingSourceId = null;
    $$(".rail-tool[data-tool]").forEach(button => button.classList.toggle("is-active", button.dataset.tool === nextMode));
    $("#connectToolbar").classList.toggle("is-active", nextMode === "connect");
    $("#connectTool").classList.toggle("is-active", nextMode === "connect");
    canvasViewport.classList.toggle("connect-mode", nextMode === "connect");
    $("#connectionMessage").textContent = nextMode === "connect" ? "Modo conexión · selecciona origen y destino" : "Modo selección";
    renderNodes();
  }

  function selectNode(id) {
    selectedNodeId = id;
    if (id) shell.classList.add("inspector-open");
    renderNodes();
    renderInspector();
  }

  function clearSelection() {
    selectedNodeId = null;
    connectingSourceId = null;
    shell.classList.remove("inspector-open");
    renderNodes();
    renderInspector();
  }

  function createNodeElement(node) {
    const meta = nodeMeta(node);
    const element = document.createElement("article");
    element.className = "flow-node";
    element.dataset.nodeId = node.id;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.setProperty("--node-color", meta.colorValue);
    if (selectedNodeId === node.id) element.classList.add("is-selected");
    if (connectingSourceId === node.id) element.classList.add("is-connecting-source");
    element.setAttribute("aria-label", `${meta.label}: ${node.title}`);

    const accent = document.createElement("div");
    accent.className = "node-accent";
    const content = document.createElement("div");
    content.className = "node-content";
    const top = document.createElement("div");
    top.className = "node-top";
    const icon = document.createElement("span");
    icon.className = "node-icon";
    icon.textContent = meta.icon;
    const copy = document.createElement("div");
    copy.className = "node-copy";
    const type = document.createElement("span");
    type.className = "node-type";
    type.textContent = meta.label;
    const name = document.createElement("strong");
    name.className = "node-name";
    name.textContent = node.title || "Sin nombre";
    copy.append(type, name);
    const actor = document.createElement("span");
    actor.className = "node-actor";
    actor.textContent = node.actor || meta.actor;
    top.append(icon, copy, actor);
    const metadata = document.createElement("div");
    metadata.className = "node-meta";
    const owner = document.createElement("span");
    owner.textContent = node.owner || "Sin responsable";
    const system = document.createElement("span");
    system.textContent = node.system || "Sin sistema";
    metadata.append(owner, system);
    content.append(top, metadata);

    const input = document.createElement("button");
    input.className = "node-port port-in";
    input.type = "button";
    input.title = "Puerto de entrada";
    input.setAttribute("aria-label", `Entrada de ${node.title}`);
    const output = document.createElement("button");
    output.className = "node-port port-out";
    output.type = "button";
    output.title = "Puerto de salida";
    output.setAttribute("aria-label", `Salida de ${node.title}`);
    element.append(accent, content, input, output);

    input.addEventListener("click", event => {
      event.stopPropagation();
      if (mode === "connect" && connectingSourceId && connectingSourceId !== node.id) connectNodes(connectingSourceId, node.id);
      else selectNode(node.id);
    });
    output.addEventListener("click", event => {
      event.stopPropagation();
      startConnection(node.id);
    });
    element.addEventListener("pointerdown", event => startNodeDrag(event, node.id, element));
    element.addEventListener("click", event => {
      if (event.target.closest("button")) return;
      if (mode === "connect") {
        if (!connectingSourceId) startConnection(node.id);
        else if (connectingSourceId !== node.id) connectNodes(connectingSourceId, node.id);
        return;
      }
      selectNode(node.id);
    });
    return element;
  }

  function renderNodes() {
    nodesLayer.innerHTML = "";
    state.nodes.forEach(node => nodesLayer.appendChild(createNodeElement(node)));
    renderEdges();
    renderMinimap();
  }

  function connectorFor(source, target) {
    const sourceHeight = nodeHeight(source);
    const targetHeight = nodeHeight(target);
    const sourceBelow = target.y < source.y - 12;
    if (!sourceBelow && Math.abs(target.x - source.x) < NODE_WIDTH * 1.35) {
      const sx = source.x + NODE_WIDTH / 2;
      const sy = source.y + sourceHeight;
      const tx = target.x + NODE_WIDTH / 2;
      const ty = target.y;
      const gap = Math.max(38, (ty - sy) * .42);
      return { path: `M ${sx} ${sy} C ${sx} ${sy + gap}, ${tx} ${ty - gap}, ${tx} ${ty}`, labelX: (sx + tx) / 2, labelY: (sy + ty) / 2 };
    }
    const toRight = target.x >= source.x;
    const sx = toRight ? source.x + NODE_WIDTH : source.x;
    const sy = source.y + sourceHeight / 2;
    const tx = toRight ? target.x : target.x + NODE_WIDTH;
    const ty = target.y + targetHeight / 2;
    const midX = sx + (tx - sx) * .5;
    return { path: `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`, labelX: midX, labelY: (sy + ty) / 2 };
  }

  function svgElement(tag, attrs = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function renderEdges() {
    edgeLayer.innerHTML = "";
    const defs = svgElement("defs");
    const marker = svgElement("marker", { id: "arrow-normal", markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto", markerUnits: "strokeWidth" });
    marker.appendChild(svgElement("path", { d: "M 0 0 L 8 4 L 0 8 z" }));
    const branchMarker = svgElement("marker", { id: "arrow-branch", markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto", markerUnits: "strokeWidth", class: "branch-marker" });
    branchMarker.appendChild(svgElement("path", { d: "M 0 0 L 8 4 L 0 8 z" }));
    defs.append(marker, branchMarker);
    edgeLayer.appendChild(defs);
    state.edges.forEach(edge => {
      const source = getNode(edge.from);
      const target = getNode(edge.to);
      if (!source || !target) return;
      const geometry = connectorFor(source, target);
      const path = svgElement("path", { d: geometry.path, class: `edge-path${edge.branch ? " is-branch" : ""}`, "marker-end": `url(#${edge.branch ? "arrow-branch" : "arrow-normal"})` });
      edgeLayer.appendChild(path);
      if (edge.label) {
        const width = Math.max(33, edge.label.length * 7 + 18);
        const rect = svgElement("rect", { x: geometry.labelX - width / 2, y: geometry.labelY - 11, width, height: 22, rx: 7, class: "edge-label-bg" });
        const text = svgElement("text", { x: geometry.labelX, y: geometry.labelY + 1, class: "edge-label-text" });
        text.textContent = edge.label;
        edgeLayer.append(rect, text);
      }
    });
  }

  function renderMinimap() {
    const map = $("#miniMap");
    const list = $(".minimap-nodes");
    if (!map || !list) return;
    list.innerHTML = "";
    state.nodes.forEach(node => {
      const item = document.createElement("span");
      item.className = "mini-node";
      item.style.left = `${node.x / SCENE_WIDTH * 100}%`;
      item.style.top = `${node.y / SCENE_HEIGHT * 100}%`;
      item.style.width = `${NODE_WIDTH / SCENE_WIDTH * 100}%`;
      item.style.height = `${nodeHeight(node) / SCENE_HEIGHT * 100}%`;
      item.style.setProperty("--node-color", nodeMeta(node).colorValue);
      list.appendChild(item);
    });
    const viewportRect = canvasViewport.getBoundingClientRect();
    const viewport = $(".minimap-viewport");
    const zoom = state.viewport.zoom;
    viewport.style.left = `${Math.max(0, -state.viewport.panX / zoom / SCENE_WIDTH * 100)}%`;
    viewport.style.top = `${Math.max(0, -state.viewport.panY / zoom / SCENE_HEIGHT * 100)}%`;
    viewport.style.width = `${Math.min(100, viewportRect.width / zoom / SCENE_WIDTH * 100)}%`;
    viewport.style.height = `${Math.min(100, viewportRect.height / zoom / SCENE_HEIGHT * 100)}%`;
  }

  function applyViewport() {
    const { zoom, panX, panY } = state.viewport;
    graphScene.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    const percentage = `${Math.round(zoom * 100)}%`;
    $("#zoomValue").textContent = percentage;
    $("#zoomFloatValue").textContent = percentage;
    renderMinimap();
  }

  function fitGraph() {
    if (!state.nodes.length) return;
    const rect = canvasViewport.getBoundingClientRect();
    const minX = Math.min(...state.nodes.map(node => node.x));
    const minY = Math.min(...state.nodes.map(node => node.y));
    const maxX = Math.max(...state.nodes.map(node => node.x + NODE_WIDTH));
    const maxY = Math.max(...state.nodes.map(node => node.y + nodeHeight(node)));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const margin = 100;
    const zoom = Math.max(.42, Math.min(1.18, Math.min((rect.width - margin) / width, (rect.height - margin) / height)));
    state.viewport.zoom = zoom;
    state.viewport.panX = (rect.width - width * zoom) / 2 - minX * zoom;
    state.viewport.panY = (rect.height - height * zoom) / 2 - minY * zoom;
    applyViewport();
    updateStatus("Diagrama reencuadrado");
  }

  function changeZoom(delta) {
    const current = state.viewport.zoom;
    const next = Math.max(.35, Math.min(1.8, Math.round((current + delta) * 20) / 20));
    const rect = canvasViewport.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ratio = next / current;
    state.viewport.panX = cx - (cx - state.viewport.panX) * ratio;
    state.viewport.panY = cy - (cy - state.viewport.panY) * ratio;
    state.viewport.zoom = next;
    applyViewport();
  }

  function zoomAt(next, clientX, clientY) {
    const rect = canvasViewport.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const current = state.viewport.zoom;
    const ratio = next / current;
    state.viewport.panX = cx - (cx - state.viewport.panX) * ratio;
    state.viewport.panY = cy - (cy - state.viewport.panY) * ratio;
    state.viewport.zoom = next;
    applyViewport();
  }

  function startNodeDrag(event, id, element) {
    if (event.button !== 0 || mode !== "select" || event.target.closest("button")) return;
    event.stopPropagation();
    const node = getNode(id);
    if (!node) return;
    const startX = event.clientX;
    const startY = event.clientY;
    nodeDrag = { id, element, startX, startY, originX: node.x, originY: node.y, moved: false };
    element.classList.add("is-dragging");
    element.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onNodeDrag);
    window.addEventListener("pointerup", finishNodeDrag, { once: true });
  }

  function onNodeDrag(event) {
    if (!nodeDrag) return;
    const node = getNode(nodeDrag.id);
    if (!node) return;
    const dx = (event.clientX - nodeDrag.startX) / state.viewport.zoom;
    const dy = (event.clientY - nodeDrag.startY) / state.viewport.zoom;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) nodeDrag.moved = true;
    node.x = Math.max(20, Math.min(SCENE_WIDTH - NODE_WIDTH - 20, nodeDrag.originX + dx));
    node.y = Math.max(20, Math.min(SCENE_HEIGHT - nodeHeight(node) - 20, nodeDrag.originY + dy));
    nodeDrag.element.style.left = `${node.x}px`;
    nodeDrag.element.style.top = `${node.y}px`;
    renderEdges();
    renderMinimap();
  }

  function finishNodeDrag() {
    if (!nodeDrag) return;
    const moved = nodeDrag.moved;
    nodeDrag.element.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onNodeDrag);
    nodeDrag = null;
    if (moved) commit("Mover nodo");
    else selectNode(selectedNodeId || null);
  }

  function startPan(event) {
    if (event.button !== 0 || mode === "connect" || event.target.closest(".flow-node") || event.target.closest(".canvas-toolbar")) return;
    panDrag = { x: event.clientX, y: event.clientY, panX: state.viewport.panX, panY: state.viewport.panY };
    canvasViewport.classList.add("is-panning");
    window.addEventListener("pointermove", onPan);
    window.addEventListener("pointerup", finishPan, { once: true });
  }

  function onPan(event) {
    if (!panDrag) return;
    state.viewport.panX = panDrag.panX + event.clientX - panDrag.x;
    state.viewport.panY = panDrag.panY + event.clientY - panDrag.y;
    applyViewport();
  }

  function finishPan() {
    canvasViewport.classList.remove("is-panning");
    window.removeEventListener("pointermove", onPan);
    panDrag = null;
  }

  function startConnection(id) {
    setMode("connect");
    connectingSourceId = id;
    $("#connectionMessage").textContent = "Origen seleccionado · elige el nodo destino";
    renderNodes();
  }

  function connectNodes(from, to) {
    if (!from || !to || from === to) return toast("Un nodo no puede conectarse consigo mismo.", true);
    if (state.edges.some(edge => edge.from === from && edge.to === to)) return toast("La conexión ya existe.", true);
    const source = getNode(from);
    const edge = { id: uid("edge"), from, to, label: source?.type === "decision" ? "Sí" : "siguiente", branch: source?.type === "decision" };
    state.edges.push(edge);
    connectingSourceId = null;
    setMode("select");
    commit("Conectar nodos");
    toast("Nodos conectados ✓");
  }

  function addNode(type) {
    const meta = NODE_TYPES[type] || NODE_TYPES.task;
    const rect = canvasViewport.getBoundingClientRect();
    const x = Math.max(30, Math.min(SCENE_WIDTH - NODE_WIDTH - 30, (rect.width / 2 - state.viewport.panX) / state.viewport.zoom - NODE_WIDTH / 2));
    const y = Math.max(30, Math.min(SCENE_HEIGHT - 100, (rect.height / 2 - state.viewport.panY) / state.viewport.zoom - 48));
    const node = { id: uid("node"), type, title: type === "task" ? "Nueva actividad" : `Nuevo ${meta.label.toLowerCase()}`, actor: meta.actor, owner: "Sin asignar", system: "Sin sistema", x, y };
    state.nodes.push(node);
    if (connectingSourceId) {
      state.edges.push({ id: uid("edge"), from: connectingSourceId, to: node.id, label: "siguiente", branch: false });
      connectingSourceId = null;
      mode = "select";
    }
    closePalette();
    selectNode(node.id);
    commit("Agregar nodo");
    toast(`${meta.label} agregado`);
  }

  function deleteSelected() {
    if (!selectedNodeId) return;
    const node = getNode(selectedNodeId);
    state.nodes = state.nodes.filter(item => item.id !== selectedNodeId);
    state.edges = state.edges.filter(edge => edge.from !== selectedNodeId && edge.to !== selectedNodeId);
    selectedNodeId = null;
    shell.classList.remove("inspector-open");
    commit("Eliminar nodo");
    toast(`${node?.title || "Nodo"} eliminado`);
  }

  function duplicateSelected() {
    const source = getNode(selectedNodeId);
    if (!source) return;
    const copy = { ...clone(source), id: uid("node"), title: `${source.title} · copia`, x: Math.min(SCENE_WIDTH - NODE_WIDTH - 20, source.x + 42), y: Math.min(SCENE_HEIGHT - 120, source.y + 42) };
    state.nodes.push(copy);
    selectNode(copy.id);
    commit("Duplicar nodo");
  }

  function autoLayout(kind) {
    if (!state.nodes.length) return;
    const levels = calculateLevels();
    if (kind === "horizontal") {
      levels.forEach((ids, level) => ids.forEach((id, index) => {
        const node = getNode(id);
        node.x = 100 + level * 315;
        node.y = 110 + index * 160;
      }));
    } else if (kind === "lanes") {
      const groups = [...new Set(state.nodes.map(node => node.actor || "SYS"))];
      state.nodes.forEach((node, index) => {
        const groupIndex = Math.max(0, groups.indexOf(node.actor || "SYS"));
        node.x = 170 + groupIndex * 325;
        node.y = 100 + index * 135;
      });
    } else {
      levels.forEach((ids, level) => ids.forEach((id, index) => {
        const node = getNode(id);
        const spread = Math.max(1, ids.length - 1) * 270;
        node.x = Math.max(70, 750 - spread / 2 + index * 270);
        node.y = 70 + level * 155;
      }));
    }
    commit(`Organizar ${kind}`);
    fitGraph();
    toast("Diagrama organizado ✓");
  }

  function calculateLevels() {
    const indegree = new Map(state.nodes.map(node => [node.id, 0]));
    state.edges.forEach(edge => indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1));
    let frontier = state.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
    if (!frontier.length) frontier = state.nodes.slice(0, 1).map(node => node.id);
    const levels = [];
    const visited = new Set();
    while (frontier.length) {
      levels.push(frontier);
      frontier.forEach(id => visited.add(id));
      const next = [];
      frontier.forEach(id => state.edges.filter(edge => edge.from === id).forEach(edge => {
        if (!visited.has(edge.to) && !next.includes(edge.to)) next.push(edge.to);
      }));
      frontier = next;
    }
    const remaining = state.nodes.map(node => node.id).filter(id => !visited.has(id));
    if (remaining.length) levels.push(remaining);
    return levels;
  }

  function validateFlow() {
    const issues = [];
    const starts = state.nodes.filter(node => node.type === "start");
    const ends = state.nodes.filter(node => node.type === "end");
    if (!starts.length) issues.push("Falta un nodo Inicio");
    if (!ends.length) issues.push("Falta un nodo Fin");
    const reachable = new Set();
    const queue = starts.map(node => node.id);
    while (queue.length) {
      const id = queue.shift();
      if (reachable.has(id)) continue;
      reachable.add(id);
      state.edges.filter(edge => edge.from === id).forEach(edge => queue.push(edge.to));
    }
    state.nodes.filter(node => !reachable.has(node.id)).forEach(node => issues.push(`Nodo aislado: ${node.title}`));
    state.nodes.filter(node => node.type === "decision").forEach(node => {
      const outgoing = state.edges.filter(edge => edge.from === node.id);
      if (outgoing.length < 2) issues.push(`La decisión “${node.title}” necesita dos salidas`);
    });
    return issues;
  }

  function updateStatus(message = "Modo selección") {
    const issues = validateFlow();
    const validation = $("#validationStatus");
    validation.textContent = issues.length ? `${issues.length} advertencia${issues.length === 1 ? "" : "s"}` : "✓ Sin errores críticos";
    validation.className = issues.length ? "validation-warning" : "validation-ok";
    $("#nodeCount").textContent = `${state.nodes.length} nodos`;
    $("#edgeCount").textContent = `${state.edges.length} conexiones`;
    $("#connectionMessage").textContent = message;
  }

  function fieldBlock(label, control) {
    const wrap = document.createElement("label");
    wrap.className = "field-block";
    const caption = document.createElement("span");
    caption.className = "field-label";
    caption.textContent = label;
    wrap.append(caption, control);
    return wrap;
  }

  function textControl(value, placeholder = "", multiline = false) {
    const control = document.createElement(multiline ? "textarea" : "input");
    control.className = "field-control";
    control.value = value || "";
    control.placeholder = placeholder;
    return control;
  }

  function selectControl(options, value) {
    const control = document.createElement("select");
    control.className = "field-control";
    options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      if (option.value === value) item.selected = true;
      control.appendChild(item);
    });
    return control;
  }

  function attachNodeField(control, node, field, { commitOnChange = true } = {}) {
    control.addEventListener("input", () => {
      node[field] = control.value;
      renderNodes();
      scheduleSave();
    });
    if (commitOnChange) control.addEventListener("change", () => commit(`Editar ${field}`));
  }

  function sectionTitle(text) {
    const title = document.createElement("div");
    title.className = "inspector-section-title";
    title.textContent = text;
    return title;
  }

  function renderInspector() {
    inspectorBody.innerHTML = "";
    inspectorFooter.innerHTML = "";
    const node = getNode(selectedNodeId);
    if (!node) {
      $("#inspectorEyebrow").textContent = "PROCESO";
      $("#inspectorTitle").textContent = "Resumen operativo";
      renderProcessInspector();
      return;
    }
    const meta = nodeMeta(node);
    $("#inspectorEyebrow").textContent = meta.label.toUpperCase();
    $("#inspectorTitle").textContent = node.title || "Editar nodo";

    const quick = document.createElement("section");
    quick.className = "inspector-section";
    quick.appendChild(sectionTitle("Propiedades rápidas"));
    const stack = document.createElement("div");
    stack.className = "field-stack";

    const titleControl = textControl(node.title, "Nombre claro y verificable");
    attachNodeField(titleControl, node, "title", { commitOnChange: true });
    titleControl.addEventListener("input", () => { $("#inspectorTitle").textContent = node.title || "Editar nodo"; });
    stack.appendChild(fieldBlock("Nombre del nodo", titleControl));

    const typeControl = selectControl(Object.entries(NODE_TYPES).map(([value, item]) => ({ value, label: item.label })), node.type);
    typeControl.addEventListener("change", () => {
      node.type = typeControl.value;
      node.actor = NODE_TYPES[node.type].actor;
      commit("Cambiar tipo de nodo");
    });
    stack.appendChild(fieldBlock("Tipo de nodo", typeControl));

    const actorControl = selectControl([
      { value: "H", label: "Humano" },
      { value: "AI", label: "Agente IA" },
      { value: "SYS", label: "Sistema" },
      { value: "H+AI", label: "Humano + IA" }
    ], node.actor || meta.actor);
    attachNodeField(actorControl, node, "actor");
    stack.appendChild(fieldBlock("Actor que ejecuta", actorControl));

    const ownerControl = textControl(node.owner, "Área, rol o persona responsable");
    attachNodeField(ownerControl, node, "owner");
    stack.appendChild(fieldBlock("Responsable", ownerControl));

    quick.appendChild(stack);
    inspectorBody.appendChild(quick);

    const systemSection = document.createElement("section");
    systemSection.className = "inspector-section";
    systemSection.appendChild(sectionTitle("Operación"));
    const systemStack = document.createElement("div");
    systemStack.className = "field-stack";
    const systemControl = textControl(node.system, "ERPNext, CRM, WhatsApp…");
    attachNodeField(systemControl, node, "system");
    systemStack.appendChild(fieldBlock("Sistema / herramienta", systemControl));
    const evidenceControl = textControl(node.evidence, "Registro que demuestra la ejecución");
    attachNodeField(evidenceControl, node, "evidence");
    systemStack.appendChild(fieldBlock("Evidencia requerida", evidenceControl));
    systemSection.appendChild(systemStack);
    inspectorBody.appendChild(systemSection);

    const instructions = document.createElement("details");
    instructions.className = "accordion";
    instructions.innerHTML = "<summary>Instrucciones y reglas</summary>";
    const instructionsBody = document.createElement("div");
    instructionsBody.className = "accordion-content";
    const instructionsControl = textControl(node.instructions, "Describe cómo se ejecuta…", true);
    attachNodeField(instructionsControl, node, "instructions");
    instructionsBody.appendChild(fieldBlock("Instrucciones", instructionsControl));
    instructions.appendChild(instructionsBody);
    inspectorBody.appendChild(instructions);

    const relations = document.createElement("details");
    relations.className = "accordion";
    relations.innerHTML = "<summary>Relaciones del nodo</summary>";
    const relationsBody = document.createElement("div");
    relationsBody.className = "accordion-content";
    const outgoing = state.edges.filter(edge => edge.from === node.id).length;
    const incoming = state.edges.filter(edge => edge.to === node.id).length;
    const grid = document.createElement("div");
    grid.className = "metric-grid";
    grid.innerHTML = `<div class="metric-box"><small>Entradas</small><strong>${incoming}</strong></div><div class="metric-box"><small>Salidas</small><strong>${outgoing}</strong></div>`;
    relationsBody.appendChild(grid);
    relations.appendChild(relationsBody);
    inspectorBody.appendChild(relations);

    const duplicate = document.createElement("button");
    duplicate.className = "secondary-button";
    duplicate.type = "button";
    duplicate.textContent = "Duplicar";
    duplicate.addEventListener("click", duplicateSelected);
    const remove = document.createElement("button");
    remove.className = "secondary-button";
    remove.type = "button";
    remove.textContent = "Eliminar";
    remove.style.color = "var(--lo-danger)";
    remove.addEventListener("click", deleteSelected);
    inspectorFooter.append(duplicate, remove);
  }

  function renderProcessInspector() {
    const health = document.createElement("div");
    health.className = "health-card";
    const issues = validateFlow();
    health.innerHTML = `<div class="health-top"><div><small>Madurez del proceso</small><strong>${issues.length ? "Requiere atención" : "Listo para operar"}</strong></div><span class="health-score">${issues.length ? "72%" : "92%"}</span></div><div class="health-bar"><span style="width:${issues.length ? "72%" : "92%"}"></span></div><div class="health-checks"><span class="ok">✓ Inicio y fin</span><span class="ok">✓ Responsables</span><span class="${issues.length ? "" : "ok"}">${issues.length ? "! Revisar flujo" : "✓ Conexiones"}</span></div>`;
    inspectorBody.appendChild(health);

    const intro = document.createElement("p");
    intro.className = "inspector-intro";
    intro.textContent = state.process.purpose;
    inspectorBody.appendChild(intro);

    const summary = document.createElement("section");
    summary.className = "inspector-section";
    summary.appendChild(sectionTitle("Información del proceso"));
    const summaryStack = document.createElement("div");
    summaryStack.className = "field-stack";
    const owner = textControl(state.process.owner, "Responsable del proceso");
    owner.addEventListener("change", () => { state.process.owner = owner.value; commit("Editar responsable"); });
    summaryStack.appendChild(fieldBlock("Propietario", owner));
    const area = textControl(state.process.area, "Área");
    area.addEventListener("change", () => { state.process.area = area.value; commit("Editar área"); });
    summaryStack.appendChild(fieldBlock("Área", area));
    summary.appendChild(summaryStack);
    inspectorBody.appendChild(summary);

    const metrics = document.createElement("section");
    metrics.className = "inspector-section";
    metrics.appendChild(sectionTitle("Resumen"));
    const grid = document.createElement("div");
    grid.className = "metric-grid";
    grid.innerHTML = `<div class="metric-box"><small>Nodos</small><strong>${state.nodes.length}</strong></div><div class="metric-box"><small>Conexiones</small><strong>${state.edges.length}</strong></div><div class="metric-box"><small>Responsables</small><strong>${new Set(state.nodes.map(node => node.owner).filter(Boolean)).size}</strong></div><div class="metric-box"><small>Versión</small><strong>${state.process.version}</strong></div>`;
    metrics.appendChild(grid);
    inspectorBody.appendChild(metrics);

    const validate = document.createElement("button");
    validate.className = "secondary-button";
    validate.type = "button";
    validate.textContent = "Validar proceso";
    validate.addEventListener("click", () => {
      if (issues.length) toast(issues.join(" · "), true);
      else toast("El proceso no tiene errores críticos ✓");
    });
    inspectorFooter.appendChild(validate);
  }

  function renderPalette() {
    const list = $("#paletteList");
    list.innerHTML = "";
    const query = paletteQuery.toLowerCase().trim();
    const groups = {};
    Object.entries(NODE_TYPES).forEach(([type, meta]) => {
      if (query && !`${meta.label} ${meta.description}`.toLowerCase().includes(query)) return;
      (groups[meta.group] ||= []).push([type, meta]);
    });
    Object.entries(groups).forEach(([group, items]) => {
      const category = document.createElement("div");
      category.className = "palette-category";
      category.textContent = group;
      list.appendChild(category);
      items.forEach(([type, meta]) => {
        const button = document.createElement("button");
        button.className = "palette-item";
        button.type = "button";
        button.style.setProperty("--node-color", meta.colorValue);
        button.innerHTML = `<span class="palette-item-icon">${meta.icon}</span><span class="palette-item-copy"><strong>${meta.label}</strong><small>${meta.description}</small></span>`;
        button.addEventListener("click", () => addNode(type));
        list.appendChild(button);
      });
    });
    if (!list.children.length) list.innerHTML = `<div class="empty-inspector"><div><strong>Sin resultados</strong><p>Prueba con actividad, decisión, sistema o IA.</p></div></div>`;
  }

  function openPalette() {
    nodePalette.hidden = false;
    paletteQuery = "";
    $("#paletteSearch").value = "";
    renderPalette();
    setTimeout(() => $("#paletteSearch")?.focus(), 30);
  }

  function closePalette() { nodePalette.hidden = true; }

  function toggleOrganizeMenu() {
    organizeMenu.hidden = !organizeMenu.hidden;
  }

  function toast(message, isError = false) {
    const region = $("#toastRegion");
    region.innerHTML = "";
    const item = document.createElement("div");
    item.className = `toast${isError ? " is-error" : ""}`;
    item.textContent = message;
    region.appendChild(item);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => item.remove(), 3200);
  }

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));

  function setActiveView(view) {
    $$(".nav-item").forEach(item => {
      const active = item.dataset.view === view;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function showFlowView() {
    flowEditor.hidden = false;
    moduleView.hidden = true;
    setActiveView("flows");
    document.title = `${state.process.title} · LivingOrg OS`;
    shell.classList.remove("inspector-open");
    closePalette();
    renderAll();
    requestAnimationFrame(() => {
      applyViewport();
      fitGraph();
    });
  }

  function moduleIcon(view) {
    return ({
      dashboard: "⌂", org: "⌘", sops: "▤", templates: "▧", execution: "▷", work: "✓",
      approvals: "□", agents: "✦", prompts: "◌", skills: "◇", knowledge: "▧", connections: "⌁",
      analytics: "▥", governance: "◈"
    })[view] || "⌁";
  }

  function stateTone(value) {
    const normalized = String(value || "").toLowerCase();
    if (/error|vencid|riesgo|alto|atenci|pendiente|piloto|cambio/.test(normalized)) return "warn";
    if (/activo|aprob|vigente|trazable|meta|normal|approved|tested|activa|public/.test(normalized)) return "good";
    if (/sistema|ia|l2|lectura|entrada|json/.test(normalized)) return "info";
    return "neutral";
  }

  function renderModuleCell(value) {
    const raw = String(value ?? "");
    const safe = escapeHtml(raw);
    if (/^(CMD|ORG|PROC|SOP|TPL|RUN|TASK|APP|AGT|PRM|SKL|KNW|CON|KPI|GOV)-/.test(raw)) {
      return `<button class="module-code-link" type="button" data-module-code="${safe}">${safe}</button>`;
    }
    return safe;
  }

  function renderModule(view, data) {
    const primaryTarget = data.target || view;
    const stats = (data.stats || []).map(([label, value, detail, tone]) => `
      <article class="module-stat-card" data-tone="${escapeHtml(tone)}">
        <span class="module-stat-label">${escapeHtml(label)}</span>
        <strong class="module-stat-value">${escapeHtml(value)}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>`).join("");

    const blocks = (data.blocks || []).map(block => `
      <article class="module-block-card" data-tone="${escapeHtml(block.tone || "blue")}">
        <div class="module-card-top"><span class="module-card-icon">${moduleIcon(view)}</span><button class="module-code-link" type="button" data-module-code="${escapeHtml(block.code)}">${escapeHtml(block.code)}</button></div>
        <h3>${escapeHtml(block.title)}</h3>
        <p>${escapeHtml(block.text)}</p>
        <button class="module-inline-action" type="button" data-target="${escapeHtml(block.target || view)}">${escapeHtml(block.action || "Abrir") } <span>↗</span></button>
      </article>`).join("");

    const table = data.columns ? `
      <section class="module-card module-table-card">
        <div class="module-section-head"><div><span class="module-section-kicker">REGISTROS CONFIGURADOS</span><h2>Catálogo del módulo</h2></div><span class="module-record-count">${data.rows.length} registros</span></div>
        <div class="module-table-wrap">
          <table class="module-table">
            <thead><tr>${data.columns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
            <tbody>${data.rows.map(row => `<tr>${row.map((cell, index) => `<td>${index === row.length - 1 ? `<span class="module-state" data-tone="${stateTone(cell)}">${escapeHtml(cell)}</span>` : renderModuleCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      </section>` : `
      <section class="module-card module-blocks-card">
        <div class="module-section-head"><div><span class="module-section-kicker">VISTAS OPERATIVAS</span><h2>Atajos del módulo</h2></div><span class="module-record-count">${data.blocks.length} tarjetas</span></div>
        <div class="module-block-grid">${blocks}</div>
      </section>`;

    const contextCodes = ["PROC-COM-001", "SOP-COM-001", "AGT-COM-001", "CON-ERP-001", "KPI-COM-001", "GOV-AUD-001"];
    const contextLinks = contextCodes.map(code => `<button class="module-context-code" type="button" data-module-code="${code}">${code}</button>`).join("");

    moduleView.innerHTML = `
      <div class="module-page">
        <header class="module-page-head">
          <div class="module-heading"><span class="module-kicker">${escapeHtml(data.kicker)}</span><h1><span class="module-title-icon">${moduleIcon(view)}</span>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.description)}</p></div>
          <div class="module-head-actions"><span class="module-code-badge">${escapeHtml(data.code)}</span><button class="secondary-button module-refresh" type="button" data-module-action="refresh">↻ Actualizar</button><button class="primary-button" type="button" data-target="${escapeHtml(primaryTarget)}">${escapeHtml(data.action || "Abrir módulo")} <span>↗</span></button></div>
        </header>
        <div class="module-stat-grid">${stats}</div>
        ${table || `<div class="module-block-grid">${blocks}</div>`}
        <div class="module-lower-grid">
          <section class="module-card module-trace-card">
            <div class="module-section-head"><div><span class="module-section-kicker">TRAZABILIDAD DEL PROCESO</span><h2>Todo vuelve a PROC-COM-001</h2></div><span class="module-live-dot"><i></i> En línea</span></div>
            <div class="module-process-strip"><span>Lead</span><b>→</b><span>Calificación</span><b>→</b><span>Cotización</span><b>→</b><span>Seguimiento</span></div>
            <p class="module-trace-copy">Consulta los objetos relacionados para revisar responsables, automatización, evidencia y controles sin perder el contexto del proceso.</p>
            <div class="module-context-links">${contextLinks}</div>
          </section>
          <section class="module-card module-check-card">
            <div class="module-section-head"><div><span class="module-section-kicker">CHECKLIST DE REVISIÓN</span><h2>Listo para validar</h2></div><span class="module-check-score">100%</span></div>
            <div class="module-check-list"><div><span>✓</span><p><strong>Identidad</strong><small>${escapeHtml(data.code)} está configurado</small></p></div><div><span>✓</span><p><strong>Relación</strong><small>Conectado a PROC-COM-001</small></p></div><div><span>✓</span><p><strong>Control</strong><small>Estado y responsable visibles</small></p></div></div>
          </section>
        </div>
      </div>`;
  }

  function showModuleView(view) {
    const data = window.LivingOrgModules?.[view];
    if (!data) return toast("Módulo no configurado.", true);
    flowEditor.hidden = true;
    moduleView.hidden = false;
    shell.classList.remove("inspector-open");
    closePalette();
    setActiveView(view);
    document.title = `${data.title} · LivingOrg OS`;
    renderModule(view, data);
  }

  function handleModuleClick(event) {
    const targetButton = event.target.closest("[data-target]");
    if (targetButton) {
      const target = targetButton.dataset.target;
      if (target === "flows") showFlowView();
      else if (window.LivingOrgModules?.[target]) showModuleView(target);
      else toast(`Ruta ${target} preparada para conectar.`);
      return;
    }
    const codeButton = event.target.closest("[data-module-code]");
    if (codeButton) {
      const code = codeButton.dataset.moduleCode;
      if (code === "PROC-COM-001") showFlowView();
      else toast(`${code} seleccionado · registro listo para revisión.`);
      return;
    }
    const actionButton = event.target.closest("[data-module-action]");
    if (actionButton?.dataset.moduleAction === "refresh") toast("Datos del módulo actualizados ✓");
  }

  function renderAll() {
    $("#processTitle").textContent = state.process.title;
    const statusBadge = $(".status-badge");
    if (statusBadge) statusBadge.innerHTML = `<i></i> ${state.process.status || "Activo"}`;
    renderNodes();
    renderInspector();
    applyViewport();
    updateStatus();
    $("#canvasEmpty").hidden = state.nodes.length > 0;
  }

  function bindEvents() {
    $("#collapseSidebar").addEventListener("click", () => {
      shell.classList.toggle("sidebar-collapsed");
      try { localStorage.setItem("livingorg.sidebar", shell.classList.contains("sidebar-collapsed") ? "collapsed" : "expanded"); } catch (error) {}
    });
    $("#mobileMenu").addEventListener("click", () => shell.classList.add("mobile-nav-open"));
    $("#mobileScrim").addEventListener("click", () => shell.classList.remove("mobile-nav-open"));
    $("#themeToggle").addEventListener("click", toggleTheme);

    $$(".nav-item").forEach(button => button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "flows") renderFlowsList();
      else showModuleView(view);
      shell.classList.remove("mobile-nav-open");
    }));
    moduleView.addEventListener("click", handleModuleClick);
    const globalSearchInput = $("#globalSearch");
    ["click", "focus"].forEach(type => globalSearchInput.addEventListener(type, () => { globalSearchInput.blur(); openCommandPalette(); }));

    [$("#openPaletteButton"), $("#addNodeToolbar"), $("#emptyAddNode")].forEach(button => button?.addEventListener("click", openPalette));
    $("#closePalette").addEventListener("click", closePalette);
    $("#paletteSearch").addEventListener("input", event => { paletteQuery = event.currentTarget.value; renderPalette(); });
    $("#connectTool").addEventListener("click", () => setMode(mode === "connect" ? "select" : "connect"));
    $("#connectToolbar").addEventListener("click", () => setMode(mode === "connect" ? "select" : "connect"));
    $("#fitButton").addEventListener("click", fitGraph);
    $("#fitButtonRail").addEventListener("click", fitGraph);
    $("#zoomIn").addEventListener("click", () => changeZoom(.1));
    $("#zoomOut").addEventListener("click", () => changeZoom(-.1));
    $("#zoomInFloat").addEventListener("click", () => changeZoom(.1));
    $("#zoomOutFloat").addEventListener("click", () => changeZoom(-.1));
    $("#toggleGrid").addEventListener("click", () => { state.grid = !state.grid; canvasViewport.classList.toggle("grid-hidden", !state.grid); });
    $("#miniMapButton").addEventListener("click", () => { $("#miniMap").hidden = !$("#miniMap").hidden; });
    $("#organizeToolbar").addEventListener("click", toggleOrganizeMenu);
    $$('[data-layout]').forEach(button => button.addEventListener("click", () => { autoLayout(button.dataset.layout); organizeMenu.hidden = true; }));
    $("#undoButton").addEventListener("click", undo);
    $("#redoButton").addEventListener("click", redo);
    $("#closeInspector").addEventListener("click", clearSelection);
    $("#backToFlows").addEventListener("click", renderFlowsList);
    $("#toolbarBack").addEventListener("click", renderFlowsList);
    $("#publishButton").addEventListener("click", publishFlow);
    $("#shareButton").addEventListener("click", () => toast("Enlace de revisión preparado para compartir."));
    $("#helpButton").addEventListener("click", openShortcuts);
    $("#canvasViewport").addEventListener("pointerdown", startPan);
    $("#canvasViewport").addEventListener("wheel", event => {
      event.preventDefault();
      const next = Math.max(.35, Math.min(1.8, state.viewport.zoom * (event.deltaY > 0 ? .92 : 1.08)));
      zoomAt(next, event.clientX, event.clientY);
    }, { passive: false });
    document.addEventListener("click", event => {
      if (!organizeMenu.hidden && !event.target.closest("#organizeMenu") && !event.target.closest("#organizeToolbar")) organizeMenu.hidden = true;
      if (!moreMenu.hidden && !event.target.closest("#moreMenu") && !event.target.closest("#moreButton")) moreMenu.hidden = true;
      if (!nodePalette.hidden && !event.target.closest("#nodePalette") && !event.target.closest("#openPaletteButton") && !event.target.closest("#addNodeToolbar") && !event.target.closest("#emptyAddNode")) closePalette();
    });
    window.addEventListener("resize", () => { applyViewport(); });

    // Command palette
    commandSearch.addEventListener("input", renderCommands);
    commandSearch.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); moveCommand(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); moveCommand(-1); }
      else if (event.key === "Enter") { event.preventDefault(); runCommand(); }
      else if (event.key === "Escape") { closeCommandPalette(); }
    });
    commandResults.addEventListener("click", event => {
      const item = event.target.closest(".command-item");
      if (!item) return;
      commandActive = Number(item.dataset.commandIndex);
      runCommand();
    });
    commandResults.addEventListener("pointermove", event => {
      const item = event.target.closest(".command-item");
      if (!item) return;
      commandActive = Number(item.dataset.commandIndex);
      $$(".command-item", commandResults).forEach((element, index) => element.classList.toggle("is-active", index === commandActive));
    });
    $$("[data-command-close]").forEach(element => element.addEventListener("click", closeCommandPalette));
    $("#closeShortcuts").addEventListener("click", closeShortcuts);
    $$("[data-shortcuts-close]").forEach(element => element.addEventListener("click", closeShortcuts));

    // More menu (exportar / importar)
    $("#moreButton").addEventListener("click", () => { moreMenu.hidden = !moreMenu.hidden; });
    $$("[data-export]").forEach(button => button.addEventListener("click", () => {
      const type = button.dataset.export;
      moreMenu.hidden = true;
      if (type === "json") exportJSON();
      else if (type === "svg") exportSVG();
      else if (type === "png") exportPNG();
      else if (type === "import") $("#importFileInput").click();
    }));
    $("#importFileInput").addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) importJSONFile(file);
      event.target.value = "";
    });

    window.addEventListener("keydown", handleKeys);
  }

  function handleKeys(event) {
    const tag = event.target?.tagName?.toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (commandPalette.hidden) openCommandPalette(); else closeCommandPalette();
      return;
    }
    if (typing) { if (event.key === "Escape") { event.target.blur(); closePalette(); } return; }
    if (event.key.toLowerCase() === "n") { event.preventDefault(); openPalette(); }
    if (event.key.toLowerCase() === "c") { event.preventDefault(); setMode(mode === "connect" ? "select" : "connect"); }
    if (event.key.toLowerCase() === "v") { event.preventDefault(); setMode("select"); }
    if (event.key.toLowerCase() === "f") { event.preventDefault(); fitGraph(); }
    if (event.key === "?") { event.preventDefault(); openShortcuts(); }
    if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
    if (event.key === "Escape") { closePalette(); closeCommandPalette(); closeShortcuts(); organizeMenu.hidden = true; setMode("select"); }
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("livingorg.theme", next);
    toast(next === "dark" ? "Tema nocturno activado" : "Tema claro activado");
  }

  function publishFlow() {
    const issues = validateFlow();
    if (issues.length) return toast("Corrige las advertencias antes de publicar.", true);
    state.process.status = "Publicado";
    commit("Publicar proceso");
    toast("Proceso publicado ✓");
  }

  // ===== Command palette (⌘K / Ctrl+K) =====
  const commandPalette = $("#commandPalette");
  const commandSearch = $("#commandSearch");
  const commandResults = $("#commandResults");
  let commandActive = -1;

  function buildCommandIndex() {
    const items = [];
    const modules = window.LivingOrgModules || {};
    Object.entries(modules).forEach(([view, data]) => {
      items.push({ type: "module", icon: moduleIcon(view), title: data.title, hint: data.code, action: () => showModuleView(view) });
    });
    const actions = [
      ["⌁", "Abrir editor de procesos", "Procesos", () => showFlowView()],
      ["＋", "Agregar nodo", "N", () => openPalette()],
      ["⌁", "Modo conexión", "C", () => setMode("connect")],
      ["↕", "Organizar en vertical", "Auto", () => autoLayout("vertical")],
      ["↔", "Organizar en horizontal", "Auto", () => autoLayout("horizontal")],
      ["▥", "Organizar por responsables", "Auto", () => autoLayout("lanes")],
      ["⌗", "Reencuadrar diagrama", "F", () => fitGraph()],
      ["↶", "Deshacer", "⌘Z", () => undo()],
      ["↷", "Rehacer", "⌘⇧Z", () => redo()],
      ["◐", "Cambiar tema", "Tema", () => toggleTheme()],
      ["✓", "Publicar proceso", "Publicar", () => publishFlow()],
      ["?", "Atajos de teclado", "Ayuda", () => openShortcuts()]
    ];
    actions.forEach(([icon, title, hint, action]) => items.push({ type: "action", icon, title, hint, action }));
    Object.entries(NODE_TYPES).forEach(([type, meta]) => {
      items.push({ type: "node", icon: meta.icon, title: `Agregar nodo · ${meta.label}`, hint: meta.group, action: () => addNode(type) });
    });
    return items;
  }

  function renderCommands() {
    const query = commandSearch.value.toLowerCase().trim();
    const filtered = buildCommandIndex().filter(item => {
      if (!query) return true;
      return `${item.title} ${item.hint} ${item.type}`.toLowerCase().includes(query);
    }).slice(0, 12);
    commandResults._filtered = filtered;
    commandResults.innerHTML = filtered.length
      ? filtered.map((item, index) => `<button class="command-item${index === 0 ? " is-active" : ""}" type="button" data-command-index="${index}"><span class="command-item-icon">${item.icon}</span><span class="command-item-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.hint)}</small></span><b class="command-item-type">${item.type === "module" ? "Módulo" : item.type === "node" ? "Nodo" : "Acción"}</b></button>`).join("")
      : `<div class="command-empty"><div>⌕</div><p>Sin resultados para “${escapeHtml(query)}”.</p></div>`;
    commandActive = filtered.length ? 0 : -1;
  }

  function moveCommand(delta) {
    const filtered = commandResults._filtered || [];
    if (!filtered.length) return;
    commandActive = (commandActive + delta + filtered.length) % filtered.length;
    $$(".command-item", commandResults).forEach((element, index) => element.classList.toggle("is-active", index === commandActive));
  }

  function runCommand() {
    const item = (commandResults._filtered || [])[commandActive];
    if (!item) return;
    closeCommandPalette();
    item.action();
  }

  function openCommandPalette() {
    commandPalette.hidden = false;
    commandSearch.value = "";
    renderCommands();
    requestAnimationFrame(() => commandSearch.focus());
  }

  function closeCommandPalette() { commandPalette.hidden = true; }

  // ===== Shortcuts modal =====
  const SHORTCUTS = [
    ["⌘ / Ctrl + K", "Búsqueda global de comandos"],
    ["N", "Agregar nodo"], ["C", "Activar conexión"], ["V", "Modo selección"], ["F", "Reencuadrar diagrama"],
    ["⌘ / Ctrl + Z", "Deshacer"], ["⌘ / Ctrl + ⇧ + Z", "Rehacer"],
    ["Delete / Backspace", "Eliminar nodo seleccionado"], ["Esc", "Cerrar paneles o cancelar conexión"], ["?", "Ver atajos"]
  ];

  function openShortcuts() {
    $("#shortcutsGrid").innerHTML = SHORTCUTS.map(([key, label]) => `<div class="shortcut-row"><kbd>${key}</kbd><span>${label}</span></div>`).join("");
    $("#shortcutsModal").hidden = false;
  }

  function closeShortcuts() { $("#shortcutsModal").hidden = true; }

  // ===== V3 · Biblioteca de procesos (multi-proceso) =====
  function loadLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) { return []; }
  }

  function saveLibrary(list) {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(list)); } catch (error) {}
  }

  function activeSnapshot() {
    return clone({ process: state.process, nodes: state.nodes, edges: state.edges, viewport: state.viewport, grid: state.grid });
  }

  function upsertActive() {
    const list = loadLibrary();
    const item = { id: state.process.id, title: state.process.title, code: state.process.code, updatedAt: Date.now(), state: activeSnapshot() };
    const index = list.findIndex(process => process.id === state.process.id);
    if (index >= 0) list[index] = item; else list.push(item);
    saveLibrary(list);
  }

  function seedLibrary() {
    if (loadLibrary().length === 0) upsertActive();
  }

  function openProcess(id) {
    const item = loadLibrary().find(process => process.id === id);
    if (!item) return toast("Proceso no encontrado.", true);
    state.process = clone(item.state.process);
    state.nodes = clone(item.state.nodes);
    state.edges = clone(item.state.edges);
    state.viewport = clone(item.state.viewport);
    state.grid = item.state.grid;
    selectedNodeId = null;
    connectingSourceId = null;
    history = [snapshot()];
    historyIndex = 0;
    showFlowView();
  }

  function newProcess() {
    state.process = { id: uid("prc"), code: "PRC-NUEVO", title: "Nuevo proceso", owner: "Sin asignar", status: "Borrador", version: "v0.1", purpose: "", outcome: "", area: "" };
    state.nodes = [];
    state.edges = [];
    state.viewport = { zoom: 1, panX: 0, panY: 0 };
    state.grid = true;
    selectedNodeId = null;
    connectingSourceId = null;
    history = [snapshot()];
    historyIndex = 0;
    upsertActive();
    showFlowView();
    toast("Proceso creado ✓");
  }

  function duplicateProcess(id) {
    const item = loadLibrary().find(process => process.id === id);
    if (!item) return;
    state.process = clone(item.state.process);
    state.process.id = uid("prc");
    state.process.title = `${state.process.title || "Proceso"} · copia`;
    state.process.version = "v0.1";
    state.nodes = clone(item.state.nodes);
    state.edges = clone(item.state.edges);
    state.viewport = clone(item.state.viewport);
    state.grid = item.state.grid;
    selectedNodeId = null;
    connectingSourceId = null;
    history = [snapshot()];
    historyIndex = 0;
    upsertActive();
    renderFlowsList();
    toast("Proceso duplicado ✓");
  }

  function deleteProcess(id) {
    const list = loadLibrary().filter(process => process.id !== id);
    saveLibrary(list);
    renderFlowsList();
    toast("Proceso eliminado");
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  }

  function renderFlowsList() {
    const list = loadLibrary();
    const cards = list.map(item => {
      const nodes = (item.state.nodes || []).length;
      const edges = (item.state.edges || []).length;
      return `
        <article class="process-card" data-process-id="${escapeHtml(item.id)}">
          <div class="process-card-top"><span class="process-card-icon">⌁</span><span class="process-card-code">${escapeHtml(item.code || "—")}</span><span class="process-card-status">${escapeHtml(item.state.process?.status || "Borrador")}</span></div>
          <h3>${escapeHtml(item.title || "Sin título")}</h3>
          <p>${escapeHtml(item.state.process?.purpose || "Sin descripción.")}</p>
          <div class="process-card-meta"><span>${nodes} nodos</span><span>·</span><span>${edges} conexiones</span><span>·</span><span>${timeAgo(item.updatedAt)}</span></div>
          <div class="process-card-actions">
            <button class="secondary-button" type="button" data-process-action="open" data-id="${escapeHtml(item.id)}">Abrir</button>
            <button class="icon-button" type="button" data-process-action="duplicate" data-id="${escapeHtml(item.id)}" title="Duplicar">⧉</button>
            <button class="icon-button" type="button" data-process-action="export" data-id="${escapeHtml(item.id)}" title="Exportar JSON">⇩</button>
            <button class="icon-button process-delete" type="button" data-process-action="delete" data-id="${escapeHtml(item.id)}" title="Eliminar">×</button>
          </div>
        </article>`;
    }).join("");

    flowEditor.hidden = true;
    moduleView.hidden = false;
    shell.classList.remove("inspector-open");
    closePalette();
    setActiveView("flows");
    document.title = "Procesos · LivingOrg OS";
    moduleView.innerHTML = `
      <div class="module-page">
        <header class="module-page-head">
          <div class="module-heading"><span class="module-kicker">PROCESS LIBRARY · FLOWS</span><h1><span class="module-title-icon">⌁</span>Procesos</h1><p>Diseña, versiona y exporta los procesos operativos de tu organización.</p></div>
          <div class="module-head-actions">
            <button class="secondary-button" type="button" id="importProcessButton">⇧ Importar JSON</button>
            <button class="primary-button" type="button" id="newProcessButton">＋ Nuevo proceso</button>
          </div>
        </header>
        <div class="process-grid">${cards || `<div class="empty-inspector"><div><strong>Sin procesos</strong><p>Crea tu primer proceso para comenzar.</p></div></div>`}</div>
      </div>`;
    $("#newProcessButton").addEventListener("click", newProcess);
    $("#importProcessButton").addEventListener("click", () => $("#importFileInput").click());
    $$(".process-card", moduleView).forEach(card => {
      card.addEventListener("click", event => {
        const button = event.target.closest("[data-process-action]");
        if (!button) { openProcess(card.dataset.processId); return; }
        const id = button.dataset.id;
        const action = button.dataset.processAction;
        if (action === "open") openProcess(id);
        else if (action === "duplicate") duplicateProcess(id);
        else if (action === "export") { openProcess(id); exportJSON(); }
        else if (action === "delete") {
          if (confirm(`¿Eliminar "${card.querySelector("h3")?.textContent || "este proceso"}"?`)) deleteProcess(id);
        }
      });
    });
  }

  // ===== V3 · Exportar / Importar =====
  function slug(value) {
    return String(value || "proceso").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "proceso";
  }

  function escapeXml(value) {
    return String(value ?? "").replace(/[<>&'"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  function exportJSON() {
    const data = { schema: 4, ...activeSnapshot() };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `proceso_${slug(state.process.title)}.json`);
    toast("JSON exportado ✓");
  }

  function importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("invalid");
        state.process = (data.process && typeof data.process === "object") ? clone(data.process) : { id: uid("prc"), code: "PRC-IMP", title: "Proceso importado", owner: "", status: "Borrador", version: "v0.1", purpose: "", outcome: "", area: "" };
        if (!state.process.id) state.process.id = uid("prc");
        state.nodes = clone(data.nodes);
        state.edges = clone(data.edges);
        state.viewport = (data.viewport && typeof data.viewport === "object") ? clone(data.viewport) : { zoom: 1, panX: 0, panY: 0 };
        state.grid = data.grid !== false;
        selectedNodeId = null;
        connectingSourceId = null;
        history = [snapshot()];
        historyIndex = 0;
        upsertActive();
        showFlowView();
        toast("Proceso importado ✓");
      } catch (error) {
        toast("No se pudo importar el archivo.", true);
      }
    };
    reader.readAsText(file);
  }

  function generateDiagramSVG() {
    const minX = Math.min(...state.nodes.map(node => node.x));
    const minY = Math.min(...state.nodes.map(node => node.y));
    const maxX = Math.max(...state.nodes.map(node => node.x + NODE_WIDTH));
    const maxY = Math.max(...state.nodes.map(node => node.y + nodeHeight(node)));
    const pad = 48;
    const width = maxX - minX + pad * 2;
    const height = maxY - minY + pad * 2;
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - pad} ${minY - pad} ${width} ${height}" font-family="Inter,sans-serif">`];
    parts.push(`<rect x="${minX - pad}" y="${minY - pad}" width="${width}" height="${height}" fill="#ffffff"/>`);
    parts.push(`<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#9aa7b5"/></marker></defs>`);
    state.edges.forEach(edge => {
      const source = getNode(edge.from);
      const target = getNode(edge.to);
      if (!source || !target) return;
      const geometry = connectorFor(source, target);
      parts.push(`<path d="${geometry.path}" fill="none" stroke="#9aa7b5" stroke-width="2" marker-end="url(#arr)"/>`);
      if (edge.label) {
        parts.push(`<rect x="${geometry.labelX - (edge.label.length * 3.6 + 9)}" y="${geometry.labelY - 11}" width="${edge.label.length * 7.2 + 18}" height="22" rx="7" fill="#ffffff" stroke="#e4e7eb"/>`);
        parts.push(`<text x="${geometry.labelX}" y="${geometry.labelY + 1}" text-anchor="middle" font-size="11" fill="#596273">${escapeXml(edge.label)}</text>`);
      }
    });
    state.nodes.forEach(node => {
      const meta = nodeMeta(node);
      const hh = nodeHeight(node);
      const shape = node.type === "decision"
        ? `<polygon points="${node.x + NODE_WIDTH / 2},${node.y} ${node.x + NODE_WIDTH},${node.y + hh / 2} ${node.x + NODE_WIDTH / 2},${node.y + hh} ${node.x},${node.y + hh / 2}" fill="#ffffff" stroke="${meta.colorValue}" stroke-width="2"/>`
        : `<rect x="${node.x}" y="${node.y}" width="${NODE_WIDTH}" height="${hh}" rx="13" fill="#ffffff" stroke="${meta.colorValue}" stroke-width="2"/>`;
      parts.push(shape);
      parts.push(`<circle cx="${node.x + 24}" cy="${node.y + 26}" r="13" fill="${meta.colorValue}"/>`);
      parts.push(`<text x="${node.x + 24}" y="${node.y + 31}" text-anchor="middle" font-size="12" fill="#ffffff">${escapeXml(meta.icon)}</text>`);
      parts.push(`<text x="${node.x + 46}" y="${node.y + 29}" font-size="13" font-weight="700" fill="#1a1a1a">${escapeXml(node.title)}</text>`);
      parts.push(`<text x="${node.x + 46}" y="${node.y + 46}" font-size="11" fill="#596273">${escapeXml(meta.label)}${node.owner ? " · " + escapeXml(node.owner) : ""}</text>`);
    });
    parts.push("</svg>");
    return parts.join("");
  }

  function exportSVG() {
    if (!state.nodes.length) return toast("Agrega nodos antes de exportar.", true);
    downloadBlob(new Blob([generateDiagramSVG()], { type: "image/svg+xml" }), `diagrama_${slug(state.process.title)}.svg`);
    toast("SVG exportado ✓");
  }

  function exportPNG() {
    if (!state.nodes.length) return toast("Agrega nodos antes de exportar.", true);
    const url = URL.createObjectURL(new Blob([generateDiagramSVG()], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, image.width, image.height);
      context.drawImage(image, 0, 0);
      canvas.toBlob(blob => { downloadBlob(blob, `diagrama_${slug(state.process.title)}.png`); URL.revokeObjectURL(url); toast("PNG exportado ✓"); }, "image/png");
    };
    image.onerror = () => { URL.revokeObjectURL(url); toast("No se pudo exportar PNG.", true); };
    image.src = url;
  }

  function boot() {
    const theme = localStorage.getItem("livingorg.theme");
    if (theme === "dark") document.documentElement.dataset.theme = "dark";
    if (localStorage.getItem("livingorg.sidebar") === "collapsed") shell.classList.add("sidebar-collapsed");
    history = [snapshot()];
    historyIndex = 0;
    bindEvents();
    seedLibrary();
    renderPalette();
    canvasViewport.classList.toggle("grid-hidden", !state.grid);
    renderFlowsList();
  }

  boot();
})();
