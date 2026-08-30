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
   *   edgeAnchor: 'lr' (izq-der, para flujos) | 'tb' (arriba-abajo, para organigrama)
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
      var nodes = [], edges = [], nodeEls = {}, selected = null;
      var dragging = null, panStart = null;

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

      function renderEdges() {
        edgesLayer.innerHTML = "";
        edges.forEach(function (e) {
          var a = nodeEls[e.from] && nodeEls[e.from].node, b = nodeEls[e.to] && nodeEls[e.to].node;
          if (!a || !b) return;
          var p = el("path", {
            class: "os-edge" + (e.cls ? " " + e.cls : "") + (e.dim ? " dim" : ""),
            d: edgePath(a, b), "marker-end": "url(#os-arrow)"
          }, edgesLayer);
          if (e.label) {
            var mid = p.getPointAtLength ? p.getPointAtLength(p.getTotalLength() / 2) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            el("text", { class: "os-edge-label", x: mid.x, y: mid.y - 4, "text-anchor": "middle" }, edgesLayer).textContent = e.label;
          }
        });
      }

      function renderNodes() {
        nodesLayer.innerHTML = ""; nodeEls = {};
        nodes.forEach(function (n) {
          var g = el("g", { class: "os-node" + (n.live ? " live" : "") + (n.id === selected ? " selected" : ""), transform: "translate(" + n.x + "," + n.y + ")" }, nodesLayer);
          el("rect", { width: n.w, height: n.h, rx: 10 }, g);
          if (opts.renderNode) opts.renderNode(g, n);
          g.style.cursor = "pointer";
          g.addEventListener("mousedown", function (ev) { startDrag(ev, n, g); });
          g.addEventListener("touchstart", function (ev) { startDrag(ev.touches[0], n, g); ev.preventDefault(); }, { passive: false });
          g.addEventListener("click", function (ev) {
            if (dragMoved) return;
            selected = n.id; renderNodes(); renderEdges();
            opts.onNodeClick && opts.onNodeClick(n);
          });
          nodeEls[n.id] = { node: n, g: g };
        });
        renderEdges();
      }

      var dragMoved = false;
      function startDrag(ev, n, g) {
        dragMoved = false;
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
          if (dragMoved) opts.onNodeDragEnd && opts.onNodeDragEnd(n, n.x, n.y);
          dragging = null;
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
      svgEl.addEventListener("click", function (ev) { if (ev.target === svgEl) { selected = null; renderNodes(); opts.onBackgroundClick && opts.onBackgroundClick(); } });

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
        select: function (id) { selected = id; renderNodes(); },
        zoom: function (delta) { scale = OS.util.clamp(scale + delta, 0.25, 2.5); applyTransform(); },
        resetView: function () { tx = 40; ty = 40; scale = 1; applyTransform(); },
        fit: function () {
          if (!nodes.length) return api.resetView();
          var minX = Math.min.apply(null, nodes.map(function (n) { return n.x; }));
          var minY = Math.min.apply(null, nodes.map(function (n) { return n.y; }));
          var maxX = Math.max.apply(null, nodes.map(function (n) { return n.x + n.w; }));
          var maxY = Math.max.apply(null, nodes.map(function (n) { return n.y + n.h; }));
          var rect = svgEl.getBoundingClientRect();
          var sx = rect.width / Math.max(1, (maxX - minX + 120)), sy = rect.height / Math.max(1, (maxY - minY + 120));
          scale = OS.util.clamp(Math.min(sx, sy), 0.25, 1.4);
          tx = 60 - minX * scale; ty = 60 - minY * scale;
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
