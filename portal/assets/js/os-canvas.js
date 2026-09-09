/*!
 * OS Canvas Engine — primitivas de pan/zoom/drag sobre SVG, reutilizadas por
 * Organigrama Vivo y Process Studio. El canvas NUNCA es la base de datos:
 * solo representa datos ya persistidos (regla del SOP técnico, sección 1.1).
 */
(function (global) {
  "use strict";
  var OS = global.OS = global.OS || {};
  var SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  /**
   * opts: {
   *   onNodeClick(node), onNodeDragEnd(node, x, y), onBackgroundClick(),
   *   renderNode(g, node) -> dibuja contenido dentro del <g> del nodo,
   *   edgeAnchor: 'lr' (izq-der, para flujos) | 'tb' (arriba-abajo, para organigrama),
   *   nodeShape: 'rect' (por defecto) | 'circle' — con 'circle' el motor no dibuja la caja
   *     visible (renderNode dibuja el círculo); solo agrega un rect invisible para hit-testing,
   *   edgeStyle: 'default' (por defecto) | 'glow' — líneas con brillo, sin flecha, coloreadas
   *     por edge.glowClass (una clase CSS que define `color` para que stroke:currentColor la herede)
   *   connectPorts: true — dibuja un puerto (●) en el borde derecho de cada nodo; arrastrar desde
   *     ahí hasta otro nodo dispara onDragConnect(fromId, toId) — BUG-03: alternativa a
   *     "clic origen → clic destino" para conectar pasos en Process Studio.
   *   onDragConnect(fromId, toId)
   * }
   */
  OS.canvas = {
    create: function (svgEl, opts) {
      opts = opts || {};
      svgEl.innerHTML = "";
      var edgeAnchor = opts.edgeAnchor || "tb";
      var vp = el("g", { class: "os-viewport" }, svgEl);
      var edgesLayer = el("g", { class: "os-edges-layer" }, vp);
      var nodesLayer = el("g", { class: "os-nodes-layer" }, vp);
      var defs = el("defs", {}, svgEl);
      defs.innerHTML = '<marker id="os-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">' +
        '<path d="M0,0 L7,3.5 L0,7 Z" fill="#3a4568"></path></marker>';

      var tx = 0, ty = 0, scale = 1;
      var nodes = [], edges = [], nodeEls = {}, selected = null, selectedEdge = null;
      var dragging = null, panStart = null;
      var snap = opts.snap === false ? 0 : (opts.snap || 10);
      function snapVal(v) { return snap ? Math.round(v / snap) * snap : v; }

      function applyTransform() { vp.setAttribute("transform", "translate(" + tx + "," + ty + ") scale(" + scale + ")"); }

      function screenToWorld(px, py) {
        var rect = svgEl.getBoundingClientRect();
        return { x: (px - rect.left - tx) / scale, y: (py - rect.top - ty) / scale };
      }

      function edgePath(a, b) {
        if (edgeAnchor === "tb") {
          var x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y;
          var midY = (y1 + y2) / 2;
          return "M " + x1 + " " + y1 + " C " + x1 + " " + midY + ", " + x2 + " " + midY + ", " + x2 + " " + y2;
        }
        var sx = a.x + a.w, sy = a.y + a.h / 2, tx2 = b.x, ty2 = b.y + b.h / 2;
        var dx = Math.max(40, Math.abs(tx2 - sx) / 2);
        return "M " + sx + " " + sy + " C " + (sx + dx) + " " + sy + ", " + (tx2 - dx) + " " + ty2 + ", " + tx2 + " " + ty2;
      }

      var glowStyle = opts.edgeStyle === "glow";
      function renderEdges() {
        edgesLayer.innerHTML = "";
        edges.forEach(function (e, idx) {
          var a = nodeEls[e.from] && nodeEls[e.from].node, b = nodeEls[e.to] && nodeEls[e.to].node;
          if (!a || !b) return;
          var eid = e.id != null ? e.id : idx;
          var d = edgePath(a, b);
          var attrs = { d: d };
          var selCls = (selectedEdge === eid ? " selected" : "");
          if (glowStyle) attrs.class = "os-edge-glow" + (e.glowClass ? " " + e.glowClass : "") + (e.dim ? " dim" : "") + selCls;
          else { attrs.class = "os-edge" + (e.cls ? " " + e.cls : "") + (e.dim ? " dim" : "") + selCls; attrs["marker-end"] = "url(#os-arrow)"; }
          var visiblePath = el("path", attrs, edgesLayer);
          if (opts.onEdgeClick || opts.selectableEdges) {
            var hit = el("path", { d: d, class: "os-edge-hit" }, edgesLayer);
            hit.addEventListener("click", function (ev) {
              ev.stopPropagation();
              selectedEdge = eid; selected = null;
              renderNodes();
              opts.onEdgeClick && opts.onEdgeClick(e, eid);
            });
          }
          if (e.label) {
            // Al 32% del trazo (cerca del origen) para no chocar con la etiqueta del nodo destino.
            var mid = visiblePath.getPointAtLength ? visiblePath.getPointAtLength(visiblePath.getTotalLength() * 0.32) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            var lbl = String(e.label);
            el("rect", { class: "os-edge-label-bg", x: mid.x - lbl.length * 3 - 3, y: mid.y - 13, width: lbl.length * 6 + 6, height: 13, rx: 3 }, edgesLayer);
            el("text", { class: "os-edge-label", x: mid.x, y: mid.y - 4, "text-anchor": "middle" }, edgesLayer).textContent = lbl;
          }
        });
      }

      function renderNodes() {
        nodesLayer.innerHTML = ""; nodeEls = {};
        nodes.forEach(function (n) {
          var nodeClass = (opts.nodeShape === "circle" ? "os-node-glow" : "os-node") + (n.live ? " live" : "") + (n.id === selected ? " selected" : "") + (n.extraClass ? " " + n.extraClass : "");
          var g = el("g", { class: nodeClass, transform: "translate(" + n.x + "," + n.y + ")" }, nodesLayer);
          if (opts.nodeShape === "circle") el("rect", { width: n.w, height: n.h, fill: "transparent" }, g);
          else el("rect", { width: n.w, height: n.h, rx: 10 }, g);
          if (opts.renderNode) opts.renderNode(g, n);
          g.style.cursor = "pointer";
          g.addEventListener("mousedown", function (ev) { startDrag(ev, n, g); });
          g.addEventListener("touchstart", function (ev) { startDrag(ev.touches[0], n, g); ev.preventDefault(); }, { passive: false });
          g.addEventListener("click", function (ev) {
            if (dragMoved) return;
            selected = n.id; selectedEdge = null; renderNodes(); renderEdges();
            opts.onNodeClick && opts.onNodeClick(n);
          });
          if (opts.connectPorts) {
            var port = el("circle", { class: "os-canvas-port", cx: n.w, cy: n.h / 2, r: 7 }, g);
            port.style.cursor = "crosshair";
            port.addEventListener("mousedown", function (ev) { ev.stopPropagation(); startConnectDrag(ev, n); });
            port.addEventListener("touchstart", function (ev) { ev.stopPropagation(); ev.preventDefault(); startConnectDrag(ev.touches[0], n); }, { passive: false });
          }
          nodeEls[n.id] = { node: n, g: g };
        });
        renderEdges();
      }

      var dragMoved = false;
      function startDrag(ev, n, g) {
        dragMoved = false;
        var origX = n.x, origY = n.y;
        var startWorld = screenToWorld(ev.clientX, ev.clientY);
        dragging = { node: n, offX: startWorld.x - n.x, offY: startWorld.y - n.y };
        function move(e2) {
          var pt = e2.touches ? e2.touches[0] : e2;
          var w = screenToWorld(pt.clientX, pt.clientY);
          var nx = w.x - dragging.offX, ny = w.y - dragging.offY;
          if (Math.abs(nx - n.x) > 1 || Math.abs(ny - n.y) > 1) dragMoved = true;
          n.x = nx; n.y = ny;
          g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
          renderEdges();
        }
        function up() {
          document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
          document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up);
          if (dragMoved) {
            n.x = snapVal(n.x); n.y = snapVal(n.y);
            g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
            renderEdges();
            opts.onNodeDragEnd && opts.onNodeDragEnd(n, n.x, n.y, { fromX: origX, fromY: origY });
          }
          dragging = null; g.classList.remove("dragging");
        }
        g.classList.add("dragging");
        document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
        document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up);
      }

      /** BUG-03: conectar arrastrando desde el puerto de un nodo hasta otro,
       * como alternativa a clic-origen/clic-destino ("modo Conectar"). */
      function startConnectDrag(ev, fromNode) {
        var phantom = el("path", { class: "os-canvas-connect-phantom" }, edgesLayer);
        var fromPt = { x: fromNode.x + fromNode.w, y: fromNode.y + fromNode.h / 2 };
        svgEl.classList.add("os-connecting");
        function pathTo(p) { return "M " + fromPt.x + " " + fromPt.y + " L " + p.x + " " + p.y; }
        function targetAt(worldPt) {
          for (var i = nodes.length - 1; i >= 0; i--) {
            var n = nodes[i];
            if (n.id === fromNode.id) continue;
            if (worldPt.x >= n.x && worldPt.x <= n.x + n.w && worldPt.y >= n.y && worldPt.y <= n.y + n.h) return n;
          }
          return null;
        }
        function move(e2) {
          var pt = e2.touches ? e2.touches[0] : e2;
          var w = screenToWorld(pt.clientX, pt.clientY);
          phantom.setAttribute("d", pathTo(w));
          var t = targetAt(w);
          Object.keys(nodeEls).forEach(function (id) { nodeEls[id].g.classList.toggle("os-connect-target", !!t && id === t.id); });
        }
        function up(e2) {
          document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
          document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up);
          svgEl.classList.remove("os-connecting");
          Object.keys(nodeEls).forEach(function (id) { nodeEls[id].g.classList.remove("os-connect-target"); });
          var pt = e2.changedTouches ? e2.changedTouches[0] : e2;
          var w = screenToWorld(pt.clientX, pt.clientY);
          var target = targetAt(w);
          phantom.remove();
          if (target) opts.onDragConnect && opts.onDragConnect(fromNode.id, target.id);
        }
        document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
        document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up);
      }

      // Pan de fondo
      svgEl.addEventListener("mousedown", function (ev) {
        if (ev.target !== svgEl) return;
        panStart = { x: ev.clientX, y: ev.clientY, tx: tx, ty: ty };
      });
      window.addEventListener("mousemove", function (ev) {
        if (!panStart) return;
        tx = panStart.tx + (ev.clientX - panStart.x); ty = panStart.ty + (ev.clientY - panStart.y);
        applyTransform();
      });
      window.addEventListener("mouseup", function () { panStart = null; });
      svgEl.addEventListener("click", function (ev) { if (ev.target === svgEl) { selected = null; selectedEdge = null; renderNodes(); opts.onBackgroundClick && opts.onBackgroundClick(); } });

      svgEl.addEventListener("wheel", function (ev) {
        ev.preventDefault();
        var rect = svgEl.getBoundingClientRect();
        var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
        var wx = (mx - tx) / scale, wy = (my - ty) / scale;
        var newScale = OS.util.clamp(scale * (ev.deltaY > 0 ? 0.9 : 1.1), 0.25, 2.5);
        tx = mx - wx * newScale; ty = my - wy * newScale; scale = newScale;
        applyTransform();
      }, { passive: false });

      var api = {
        setData: function (n, e) { nodes = n || []; edges = e || []; renderNodes(); },
        select: function (id) { selected = id; selectedEdge = null; renderNodes(); },
        selectEdge: function (id) { selectedEdge = id; selected = null; renderNodes(); },
        clearSelection: function () { selected = null; selectedEdge = null; renderNodes(); },
        zoom: function (delta) { scale = OS.util.clamp(scale + delta, 0.25, 2.5); applyTransform(); },
        resetView: function () { tx = 40; ty = 40; scale = 1; applyTransform(); },
        /** Centra la vista sobre un nodo (por id) sin cambiar el zoom. */
        centerOn: function (id) {
          var ne = nodeEls[id]; if (!ne) return;
          var rect = svgEl.getBoundingClientRect();
          tx = rect.width / 2 - (ne.node.x + ne.node.w / 2) * scale;
          ty = rect.height / 2 - (ne.node.y + ne.node.h / 2) * scale;
          applyTransform();
        },
        fit: function () {
          if (!nodes.length) return api.resetView();
          var minX = Math.min.apply(null, nodes.map(function (n) { return n.x; }));
          var minY = Math.min.apply(null, nodes.map(function (n) { return n.y; }));
          var maxX = Math.max.apply(null, nodes.map(function (n) { return n.x + n.w; }));
          var maxY = Math.max.apply(null, nodes.map(function (n) { return n.y + n.h; }));
          // Margen extra (arriba para no meterse bajo la barra de herramientas, abajo para las
          // etiquetas de texto que cuelgan bajo cada nodo).
          var padTop = opts.padTop || 70;
          var rect = svgEl.getBoundingClientRect();
          var sx = rect.width / Math.max(1, (maxX - minX + 140)), sy = rect.height / Math.max(1, (maxY - minY + padTop + 130));
          scale = OS.util.clamp(Math.min(sx, sy), 0.25, 1.4);
          tx = 70 - minX * scale; ty = padTop - minY * scale;
          applyTransform();
        },
        highlightDim: function (idsToKeep) {
          Object.keys(nodeEls).forEach(function (id) { nodeEls[id].g.style.opacity = (!idsToKeep || idsToKeep.indexOf(id) !== -1) ? "1" : ".18"; });
        }
      };
      api.resetView();
      return api;
    }
  };
})(window);
