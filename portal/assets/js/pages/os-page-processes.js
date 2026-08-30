/*! Páginas: Biblioteca de Procesos (/processes) y Process Studio (/processes/:name). */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  var STEP_ICON = { START: "▶", HUMAN: "🧑", HYBRID: "🤝", AI: "✳", SYSTEM: "⚙", GATEWAY: "◆", APPROVAL: "✅", WAIT: "⏱", END: "⏹" };
  var STEP_TYPES = Object.keys(STEP_ICON);
  var EXEC_TYPES = ["H", "H+AI", "AI→H", "AI", "SYS"];
  var STATUS_FLOW = ["Draft", "Pilot", "Active", "Degraded", "Retired"];

  function fieldRow(l, html, hint) { return '<div class="os-field"><label>' + l + (hint ? ' <span class="hint">' + hint + "</span>" : "") + '</label>' + html + '</div>'; }
  function opt(list, sel) { return list.map(function (v) { return '<option' + (v === sel ? " selected" : "") + '>' + v + '</option>'; }).join(""); }

  /* ============================= /processes — Biblioteca ============================= */
  function mountList(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Biblioteca de Procesos</div>' +
      '<div class="os-page-sub">Owner, estado, riesgo, versión y última ejecución.</div></div>' +
      '<div class="os-page-actions"><button class="os-btn primary" id="os-new-process">＋ Nuevo proceso</button></div></div>' +
      '<div class="os-toolbar"><input class="os-input" id="os-proc-search" placeholder="Buscar por título o código…" style="max-width:260px">' +
      '<select class="os-select" id="os-proc-status" style="max-width:170px"><option value="">Todos los estados</option>' + opt(STATUS_FLOW) + '</select></div>' +
      '<div class="os-table-wrap"><div class="os-card" id="os-proc-table">' + ui.skeleton(6) + '</div></div>';

    var all = [];
    function render() {
      var q = container.querySelector("#os-proc-search").value.toLowerCase();
      var st = container.querySelector("#os-proc-status").value;
      var rows = all.filter(function (p) {
        return (!st || p.status === st) && (!q || (p.process_title || "").toLowerCase().indexOf(q) !== -1 || (p.process_code || "").toLowerCase().indexOf(q) !== -1);
      });
      var host = container.querySelector("#os-proc-table");
      if (!rows.length) { host.innerHTML = ui.empty("🔀", "Sin procesos", "Crea el primero con “Nuevo proceso”."); return; }
      host.innerHTML = '<table class="os-table"><thead><tr><th>Proceso</th><th>Owner</th><th>Estado</th><th>Riesgo</th><th>Autonomía</th><th>Versión</th><th>Modificado</th></tr></thead><tbody>' +
        rows.map(function (p) {
          return "<tr data-n='" + p.name + "'><td><b>" + U.escapeHtml(p.process_title) + "</b><div class='muted' style='font-size:11.5px'>" + U.escapeHtml(p.process_code || "") + "</div></td>" +
            "<td>" + U.escapeHtml(p.owner_user || "—") + "</td><td>" + ui.badgeStatus(p.status) + "</td><td>" + ui.badgeRisk(p.risk_level) + "</td>" +
            "<td><span class='os-tag'>" + U.escapeHtml(p.max_autonomy || "—") + "</span></td><td>" + U.escapeHtml(p.version_label || "—") + "</td>" +
            "<td class='muted'>" + U.timeAgo(p.modified) + "</td></tr>";
        }).join("") + "</tbody></table>";
      host.querySelectorAll("tr[data-n]").forEach(function (tr) { tr.onclick = function () { OS.router.navigate("/processes/" + tr.dataset.n); }; });
    }

    api.list("OS Process", { fields: ["name", "process_title", "process_code", "owner_user", "status", "risk_level", "max_autonomy", "version_label", "modified"], orderBy: "modified desc", limit: 200 })
      .then(function (rows) { all = rows; render(); }).catch(ui.error);

    container.querySelector("#os-proc-search").oninput = render;
    container.querySelector("#os-proc-status").onchange = render;
    container.querySelector("#os-new-process").onclick = function () { openCreateProcess(); };
  }

  function openCreateProcess() {
    var body = document.createElement("div");
    body.innerHTML =
      fieldRow("Título", '<input class="os-input" id="p-title" placeholder="Ej. Lead a Cotización">') +
      fieldRow("Código funcional (único)", '<input class="os-input" id="p-code" placeholder="PROC-SALES-001">') +
      '<div class="os-row">' +
      fieldRow("Empresa", '<input class="os-input" id="p-company">') +
      fieldRow("Owner (usuario)", '<input class="os-input" id="p-owner">') + '</div>' +
      fieldRow("Propósito / resultado de negocio", '<textarea class="os-textarea" id="p-purpose" style="font-family:inherit"></textarea>') +
      '<div class="os-row">' +
      fieldRow("Autonomía máxima", '<select class="os-select" id="p-auto">' + opt(["L0", "L1", "L2", "L3", "L4"]) + '</select>') +
      fieldRow("Riesgo", '<select class="os-select" id="p-risk">' + opt(["Low", "Medium", "High", "Critical"]) + '</select>') + '</div>';
    ui.attachLinkSearch(body.querySelector("#p-company"), "Company");
    ui.attachLinkSearch(body.querySelector("#p-owner"), "User");
    ui.modal({
      title: "Nuevo proceso", body: body,
      actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear proceso", cls: "primary", onClick: function () {
            var title = body.querySelector("#p-title").value.trim();
            if (!title) { ui.toast("El título es obligatorio", "warn"); return false; }
            api.create("OS Process", {
              process_title: title, process_code: body.querySelector("#p-code").value.trim() || undefined,
              company: body.querySelector("#p-company").value.trim() || undefined,
              owner_user: body.querySelector("#p-owner").value.trim() || undefined,
              purpose: body.querySelector("#p-purpose").value.trim(),
              max_autonomy: body.querySelector("#p-auto").value, risk_level: body.querySelector("#p-risk").value,
              status: "Draft", version_label: "v0.1", trigger_type: "Manual", steps: [], edges: []
            }).then(function (doc) { ui.toast("Proceso creado en Draft", "ok"); OS.router.navigate("/processes/" + doc.name); })
              .catch(ui.error);
          }
        }
      ]
    });
  }

  /* ============================= /processes/:name — Process Studio ============================= */
  function mountStudio(container, params) {
    container.innerHTML = '<div id="os-studio-head"></div><div class="os-canvas-wrap" style="margin-top:14px"><div id="os-studio-canvas" style="position:absolute;inset:0"></div></div>';
    var name = params.name;
    var proc, engine, connectMode = false, connectFrom = null;

    function saveIndicatorEl() { return container.querySelector("#os-save-state"); }
    function persist(patch) {
      ui.saveState(saveIndicatorEl(), "saving");
      return api.update("OS Process", proc.name, patch).then(function (doc) {
        Object.assign(proc, doc); ui.saveState(saveIndicatorEl(), "saved");
      }).catch(function (e) { ui.saveState(saveIndicatorEl(), "error"); ui.error(e); throw e; });
    }
    var persistDebounced = U.debounce(function () { persist({ steps: proc.steps, edges: proc.edges }); }, 700);

    function guardActiveEdit() {
      if (proc.status !== "Active") return Promise.resolve(true);
      return ui.confirm("Este proceso está Active. Para hacer un cambio estructural debe volver a Draft (regla de no-regresión). ¿Volver a Draft ahora?", { okLabel: "Volver a Draft" })
        .then(function (ok) { if (!ok) return false; return persist({ status: "Draft" }).then(function () { renderHead(); return true; }); });
    }

    function renderHead() {
      var head = container.querySelector("#os-studio-head");
      head.innerHTML =
        '<div class="os-page-head"><div>' +
        '<div class="os-crumb" style="margin-bottom:4px"><a href="#/processes">Procesos</a> / ' + U.escapeHtml(proc.process_code || proc.name) + '</div>' +
        '<div class="os-page-title">' + U.escapeHtml(proc.process_title) + ' ' + ui.badgeStatus(proc.status) + '</div>' +
        '<div class="os-page-sub">' + U.escapeHtml(proc.purpose || "Sin propósito declarado") + '</div></div>' +
        '<div class="os-page-actions">' +
        '<span class="os-save-state" id="os-save-state"></span>' +
        '<select class="os-select" id="os-status-sel" style="max-width:150px">' + opt(STATUS_FLOW, proc.status) + '</select>' +
        '<button class="os-btn" id="os-add-step">＋ Paso</button>' +
        '<button class="os-btn" id="os-connect">🔗 Conectar</button>' +
        '<button class="os-btn primary" id="os-run-test">▶ Ejecutar prueba</button>' +
        '</div></div>' +
        '<div class="os-toolbar"><span class="os-tag">Versión ' + U.escapeHtml(proc.version_label || "—") + '</span>' +
        '<span class="os-tag">Autonomía ' + U.escapeHtml(proc.max_autonomy || "—") + '</span>' +
        ui.badgeRisk(proc.risk_level) +
        '<span class="os-tag">SOP: ' + (proc.sop ? "<a href='#/sop/" + proc.sop + "'>" + U.escapeHtml(proc.sop) + "</a>" : "sin vincular") + '</span>' +
        '<button class="os-btn sm ghost" id="os-link-sop">Vincular SOP</button></div>';
      ui.saveState(saveIndicatorEl(), "idle");

      head.querySelector("#os-status-sel").onchange = function (e) {
        var next = e.target.value;
        var msg = next === "Active" ? "¿Publicar esta versión como Active? Quedará disponible para iniciar runs reales." :
          next === "Retired" ? "¿Retirar el proceso? No podrá iniciar nuevos runs." : "¿Confirmar cambio de estado a " + next + "?";
        ui.confirm(msg).then(function (ok) {
          if (!ok) { e.target.value = proc.status; return; }
          var patch = { status: next };
          if (next === "Active") patch.published_on = new Date().toISOString().slice(0, 19).replace("T", " ");
          persist(patch).then(renderHead);
        });
      };
      head.querySelector("#os-add-step").onclick = function () { guardActiveEdit().then(function (ok) { if (ok) addStep(); }); };
      head.querySelector("#os-connect").onclick = function () {
        connectMode = !connectMode; connectFrom = null;
        head.querySelector("#os-connect").classList.toggle("primary", connectMode);
        ui.toast(connectMode ? "Modo conectar: haz clic en el paso de origen y luego el de destino." : "Modo conectar desactivado", "warn");
      };
      head.querySelector("#os-run-test").onclick = function () { runProcessTest(); };
      head.querySelector("#os-link-sop").onclick = function () { linkSop(); };
    }

    function linkSop() {
      var body = document.createElement("div");
      body.innerHTML = fieldRow("Código de SOP existente", '<input class="os-input" id="s-code">');
      ui.attachLinkSearch(body.querySelector("#s-code"), "OS SOP");
      ui.modal({
        title: "Vincular SOP", body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Vincular", cls: "primary", onClick: function () { persist({ sop: body.querySelector("#s-code").value.trim() }).then(renderHead); } }]
      });
    }

    function runProcessTest() {
      if (proc.status === "Retired") { ui.toast("El proceso está retirado; no puede iniciar nuevos runs.", "warn"); return; }
      ui.confirm("Se creará un OS Run en modo prueba para \"" + proc.process_title + "\".").then(function (ok) {
        if (!ok) return;
        api.create("OS Run", {
          run_code: (proc.process_code || proc.name) + "-" + Date.now().toString(36).toUpperCase(),
          process: proc.name, process_version: proc.version_label, status: "Queued", trigger_type: "Manual",
          initiated_by: OS.session.user, started_at: new Date().toISOString().slice(0, 19).replace("T", " "),
          current_step_key: (proc.steps[0] || {}).step_key || ""
        }).then(function (run) { ui.toast("Run creado: " + run.name, "ok"); OS.router.navigate("/runs/" + run.name); }).catch(ui.error);
      });
    }

    function toCanvasData() {
      var cn = (proc.steps || []).map(function (s) { return { id: s.step_key, x: s.x || 0, y: s.y || 0, w: 176, h: 62, data: s }; });
      var ce = (proc.edges || []).map(function (e) { return { from: e.source_step_key, to: e.target_step_key, label: e.relation_type + (e.label ? ": " + e.label : ""), cls: e.relation_type === "ERROR" ? "error" : (e.relation_type === "TRUE" ? "true" : e.relation_type === "FALSE" ? "false" : "") }; });
      if (cn.some(function (n) { return !n.x && !n.y; })) cn.forEach(function (n, i) { if (!n.x && !n.y) { n.x = 60 + i * 230; n.y = 60; } });
      return { cn: cn, ce: ce };
    }

    function renderCanvas() {
      var data = toCanvasData();
      var svg = container.querySelector("#os-studio-canvas");
      if (!engine) {
        svg.innerHTML = '<div class="os-canvas-toolbar"><button class="os-btn sm" data-a="fit">⤢ Ajustar</button></div><svg class="os-canvas-svg"></svg>';
        engine = OS.canvas.create(svg.querySelector("svg"), {
          edgeAnchor: "lr",
          renderNode: function (g, n) {
            var s = n.data;
            var t1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t1.setAttribute("x", 12); t1.setAttribute("y", 22); t1.setAttribute("class", "n-title");
            t1.textContent = STEP_ICON[s.step_type] + " " + (s.step_title || s.step_key).slice(0, 22);
            g.appendChild(t1);
            var t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t2.setAttribute("x", 12); t2.setAttribute("y", 40); t2.setAttribute("class", "n-sub");
            t2.textContent = s.execution_type + " · " + (s.actor_user || s.actor_role || s.actor_agent || s.actor_kind || "");
            g.appendChild(t2);
          },
          onNodeClick: function (n) {
            if (connectMode) {
              if (!connectFrom) { connectFrom = n.id; ui.toast("Origen: " + n.id + ". Ahora elige el destino.", "warn"); return; }
              if (connectFrom === n.id) { connectFrom = null; return; }
              openEdgeModal(connectFrom, n.id); connectFrom = null; return;
            }
            openStepInspector(proc.steps.find(function (s) { return s.step_key === n.id; }));
          },
          onNodeDragEnd: function (n) {
            var s = proc.steps.find(function (x) { return x.step_key === n.id; });
            s.x = Math.round(n.x); s.y = Math.round(n.y);
            persistDebounced();
          }
        });
        svg.querySelector('[data-a="fit"]').onclick = engine.fit;
      }
      engine.setData(data.cn, data.ce);
    }

    function addStep() {
      var key = U.uid("step");
      proc.steps = proc.steps || [];
      proc.steps.push({ step_key: key, step_title: "Nuevo paso", step_type: "HUMAN", execution_type: "H", actor_kind: "User", x: 60 + proc.steps.length * 40, y: 60 + proc.steps.length * 30 });
      persist({ steps: proc.steps, edges: proc.edges }).then(function () { renderCanvas(); });
    }

    function openEdgeModal(from, to) {
      guardActiveEdit().then(function (ok) {
        if (!ok) return;
        var body = document.createElement("div");
        body.innerHTML = fieldRow("Tipo de relación", '<select class="os-select" id="e-type">' + opt(["NEXT", "TRUE", "FALSE", "ERROR", "TIMEOUT", "HANDOFF"]) + '</select>') +
          fieldRow("Condición (declarativa, opcional)", '<input class="os-input" id="e-cond" placeholder="ej. score >= 80">') +
          fieldRow("Etiqueta visual", '<input class="os-input" id="e-label">');
        ui.modal({
          title: "Conectar " + from + " → " + to, body: body,
          actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
          {
            label: "Crear conexión", cls: "primary", onClick: function () {
              proc.edges = proc.edges || [];
              proc.edges.push({ edge_key: U.uid("edge"), source_step_key: from, target_step_key: to, relation_type: body.querySelector("#e-type").value, condition_expression: body.querySelector("#e-cond").value, label: body.querySelector("#e-label").value });
              persist({ steps: proc.steps, edges: proc.edges }).then(function () { renderCanvas(); });
            }
          }]
        });
      });
    }

    function openStepInspector(step) {
      if (!step) return;
      var body = document.createElement("div");
      body.innerHTML =
        '<div class="os-section-title">Identidad</div>' +
        fieldRow("Nombre corto", '<input class="os-input" f="step_title" value="' + U.escapeHtml(step.step_title || "") + '">') +
        '<div class="os-row">' +
        fieldRow("Tipo de bloque", '<select class="os-select" f="step_type">' + opt(STEP_TYPES, step.step_type) + '</select>') +
        fieldRow("Tipo de ejecución", '<select class="os-select" f="execution_type">' + opt(EXEC_TYPES, step.execution_type) + '</select>') + '</div>' +
        '<div class="os-section-title">Actor</div>' +
        fieldRow("Clase de actor", '<select class="os-select" f="actor_kind">' + opt(["User", "Role", "Agent", "System"], step.actor_kind) + '</select>') +
        fieldRow("Usuario (si aplica)", '<input class="os-input" f="actor_user" id="ai-actor-user" value="' + U.escapeHtml(step.actor_user || "") + '">') +
        fieldRow("Rol (si aplica)", '<input class="os-input" f="actor_role" id="ai-actor-role" value="' + U.escapeHtml(step.actor_role || "") + '">') +
        fieldRow("Agente IA (si aplica)", '<input class="os-input" f="actor_agent" id="ai-actor-agent" value="' + U.escapeHtml(step.actor_agent || "") + '">') +
        '<div class="os-section-title">Contrato del paso</div>' +
        fieldRow("Instrucciones", '<textarea class="os-textarea" f="instructions">' + U.escapeHtml(step.instructions || "") + '</textarea>') +
        fieldRow("Evidence policy — qué prueba que terminó", '<input class="os-input" f="evidence_policy" value="' + U.escapeHtml(step.evidence_policy || "") + '">') +
        '<div class="os-row">' +
        fieldRow("SLA (min)", '<input class="os-input" type="number" f="sla_minutes" value="' + (step.sla_minutes || "") + '">') +
        fieldRow("Requiere aprobación", '<div class="os-check" style="padding-top:8px"><input type="checkbox" f="requires_approval" ' + (step.requires_approval ? "checked" : "") + '> Sí</div>') + '</div>' +
        fieldRow("Rol aprobador (si aplica)", '<input class="os-input" f="approval_role" id="ai-approval-role" value="' + U.escapeHtml(step.approval_role || "") + '">') +
        '<div class="os-row">' +
        fieldRow("Prompt vinculado", '<input class="os-input" f="prompt" id="ai-prompt" value="' + U.escapeHtml(step.prompt || "") + '">') +
        fieldRow("Agente vinculado", '<input class="os-input" f="agent" id="ai-agent" value="' + U.escapeHtml(step.agent || "") + '">') + '</div>' +
        '<div class="os-section-title">Schemas declarativos</div>' +
        fieldRow("Input schema (JSON)", '<textarea class="os-textarea" f="input_schema">' + U.escapeHtml(step.input_schema || "") + '</textarea>') +
        fieldRow("Output schema (JSON)", '<textarea class="os-textarea" f="output_schema">' + U.escapeHtml(step.output_schema || "") + '</textarea>');

      ui.attachLinkSearch(body.querySelector("#ai-actor-user"), "User");
      ui.attachLinkSearch(body.querySelector("#ai-actor-role"), "Role");
      ui.attachLinkSearch(body.querySelector("#ai-approval-role"), "Role");
      ui.attachLinkSearch(body.querySelector("#ai-actor-agent"), "OS Agent");
      ui.attachLinkSearch(body.querySelector("#ai-agent"), "OS Agent");
      ui.attachLinkSearch(body.querySelector("#ai-prompt"), "OS Prompt");

      var foot = document.createElement("div");
      foot.innerHTML = '<button class="os-btn danger sm" id="step-del">Eliminar paso</button><div class="os-spacer"></div><button class="os-btn primary sm" id="step-save">Guardar paso</button>';

      ui.inspector.open({ title: step.step_title || step.step_key, subtitle: step.step_key, body: body, foot: foot });

      foot.querySelector("#step-save").onclick = function () {
        guardActiveEdit().then(function (ok) {
          if (!ok) return;
          body.querySelectorAll("[f]").forEach(function (elx) {
            var f = elx.getAttribute("f");
            step[f] = elx.type === "checkbox" ? (elx.checked ? 1 : 0) : elx.value;
          });
          persist({ steps: proc.steps, edges: proc.edges }).then(function () { ui.toast("Paso guardado", "ok"); renderCanvas(); });
        });
      };
      foot.querySelector("#step-del").onclick = function () {
        ui.confirm("¿Eliminar el paso \"" + (step.step_title || step.step_key) + "\" y sus conexiones?", { danger: true }).then(function (okc) {
          if (!okc) return;
          guardActiveEdit().then(function (ok) {
            if (!ok) return;
            proc.steps = proc.steps.filter(function (s) { return s.step_key !== step.step_key; });
            proc.edges = (proc.edges || []).filter(function (e) { return e.source_step_key !== step.step_key && e.target_step_key !== step.step_key; });
            persist({ steps: proc.steps, edges: proc.edges }).then(function () { ui.inspector.close(); renderCanvas(); });
          });
        });
      };
    }

    api.get("OS Process", name).then(function (doc) {
      proc = doc; proc.steps = proc.steps || []; proc.edges = proc.edges || [];
      renderHead(); renderCanvas(); setTimeout(function () { engine && engine.fit(); }, 30);
    }).catch(function (e) { container.innerHTML = ui.empty("⚠️", "No se pudo abrir el proceso", e.message); });
  }

  OS.router.register("/processes", { title: "Biblioteca de Procesos", mount: mountList, unmount: function () {} });
  OS.router.register("/processes/:name", { title: "Process Studio", mount: mountStudio, unmount: function () {} });
})(window);
