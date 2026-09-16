/*!
 * LivingOrg OS — frontend hardening layer.
 *
 * Se carga después de os-core.js para reforzar superficies dinámicas sin
 * reescribir los módulos existentes. Mantiene compatibilidad con el portal
 * actual y no introduce dependencias externas.
 */
(function (global) {
  "use strict";

  var OS = global.OS = global.OS || {};
  var U = OS.util || {};
  var ui = OS.ui || {};

  var ALLOWED_TAGS = {
    A: true, B: true, BLOCKQUOTE: true, BR: true, CODE: true, DIV: true,
    EM: true, H1: true, H2: true, H3: true, H4: true, HR: true, I: true,
    IMG: true, LI: true, OL: true, P: true, PRE: true, SPAN: true,
    STRONG: true, TABLE: true, TBODY: true, TD: true, TH: true,
    THEAD: true, TR: true, U: true, UL: true
  };
  var DROP_CONTENT_TAGS = { SCRIPT: true, STYLE: true, IFRAME: true, OBJECT: true, EMBED: true, SVG: true, MATH: true };
  var ALLOWED_ATTRS = {
    A: { href: true, title: true, target: true, rel: true },
    IMG: { src: true, alt: true, title: true, width: true, height: true },
    TD: { colspan: true, rowspan: true },
    TH: { colspan: true, rowspan: true },
    '*': { class: true }
  };

  function isSafeUrl(value, options) {
    options = options || {};
    if (!value) return false;
    var raw = String(value).trim();
    if (!raw) return false;
    if (raw.charAt(0) === '#') return true;
    if (raw.charAt(0) === '/' && raw.slice(0, 2) !== '//') return true;
    try {
      var parsed = new URL(raw, global.location.origin);
      if (parsed.origin === global.location.origin && parsed.protocol === global.location.protocol) return true;
      if (options.image) return parsed.protocol === 'https:';
      return parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:';
    } catch (e) {
      return false;
    }
  }

  function safeUrl(value, options) {
    return isSafeUrl(value, options) ? String(value).trim() : '';
  }

  function sanitizeElement(source, outputDoc) {
    var tag = source.tagName;
    if (DROP_CONTENT_TAGS[tag]) return null;
    if (!ALLOWED_TAGS[tag]) {
      var fragment = outputDoc.createDocumentFragment();
      Array.prototype.forEach.call(source.childNodes, function (child) {
        var safeChild = sanitizeNode(child, outputDoc);
        if (safeChild) fragment.appendChild(safeChild);
      });
      return fragment;
    }

    var el = outputDoc.createElement(tag.toLowerCase());
    Array.prototype.forEach.call(source.attributes || [], function (attr) {
      var name = attr.name.toLowerCase();
      if (name.indexOf('on') === 0 || name === 'style' || name === 'srcdoc') return;
      var tagAttrs = ALLOWED_ATTRS[tag] || {};
      var globalAttrs = ALLOWED_ATTRS['*'] || {};
      if (!tagAttrs[name] && !globalAttrs[name]) return;

      var value = attr.value;
      if (tag === 'A' && name === 'href') value = safeUrl(value);
      if (tag === 'IMG' && name === 'src') value = safeUrl(value, { image: true });
      if ((name === 'href' || name === 'src') && !value) return;
      if (name === 'target') value = value === '_blank' ? '_blank' : '_self';
      if (name === 'rel') return; // se establece de forma segura más abajo.
      if (name === 'class') {
        value = String(value).split(/\s+/).filter(function (token) {
          return /^os-[a-z0-9_-]+$/i.test(token);
        }).join(' ');
        if (!value) return;
      }
      el.setAttribute(name, value);
    });

    if (tag === 'A') {
      var href = el.getAttribute('href');
      if (href && /^https:/i.test(href)) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (tag === 'IMG' && !el.hasAttribute('alt')) el.setAttribute('alt', '');

    Array.prototype.forEach.call(source.childNodes, function (child) {
      var safeChild = sanitizeNode(child, outputDoc);
      if (safeChild) el.appendChild(safeChild);
    });
    return el;
  }

  function sanitizeNode(node, outputDoc) {
    if (node.nodeType === Node.TEXT_NODE) return outputDoc.createTextNode(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    return sanitizeElement(node, outputDoc);
  }

  function sanitizeHtml(html) {
    var parser = new DOMParser();
    var parsed = parser.parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    var output = document.implementation.createHTMLDocument('');
    var host = output.createElement('div');
    var source = parsed.body.firstElementChild;
    if (!source) return '';
    Array.prototype.forEach.call(source.childNodes, function (child) {
      var safe = sanitizeNode(child, output);
      if (safe) host.appendChild(safe);
    });
    return host.innerHTML;
  }

  U.safeUrl = safeUrl;
  U.sanitizeHtml = sanitizeHtml;

  // Reforzar editor enriquecido sin cambiar su API pública.
  if (typeof ui.richEditor === 'function' && !ui.richEditor.__osHardened) {
    var originalRichEditor = ui.richEditor;
    var hardenedRichEditor = function (container, opts) {
      opts = opts || {};
      var safeOpts = Object.assign({}, opts, { value: sanitizeHtml(opts.value || '') });
      var editor = originalRichEditor(container, safeOpts);
      if (editor && editor.el) {
        editor.el.addEventListener('paste', function (event) {
          if (!event.clipboardData) return;
          var html = event.clipboardData.getData('text/html');
          if (!html) return;
          event.preventDefault();
          document.execCommand('insertHTML', false, sanitizeHtml(html));
        });
      }
      if (editor && typeof editor.getHTML === 'function') {
        var oldGet = editor.getHTML;
        editor.getHTML = function () { return sanitizeHtml(oldGet.call(editor)); };
      }
      if (editor && typeof editor.setHTML === 'function') {
        var oldSet = editor.setHTML;
        editor.setHTML = function (html) { return oldSet.call(editor, sanitizeHtml(html)); };
      }
      return editor;
    };
    hardenedRichEditor.__osHardened = true;
    ui.richEditor = hardenedRichEditor;
  }

  // Mantener descargas/enlaces de adjuntos dentro de protocolos permitidos.
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('.os-app a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (!safeUrl(href)) {
      event.preventDefault();
      if (ui.toast) ui.toast('Enlace bloqueado por seguridad.', 'warn');
    }
  }, true);

  // El preview original del SOP renderiza `instruction` como HTML. Capturamos la
  // acción antes que el listener del módulo y generamos una vista sanitizada.
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('#sop-preview');
    if (!trigger || !OS.api || !ui.modal) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    var hash = global.location.hash.replace(/^#/, '');
    var match = /^\/sop\/([^/?#]+)/.exec(hash);
    if (!match) return;
    var name = decodeURIComponent(match[1]);

    trigger.disabled = true;
    OS.api.get('OS SOP', name).then(function (sop) {
      var body = document.createElement('div');
      var title = document.createElement('h2');
      title.textContent = sop.sop_title || sop.name || 'SOP';
      body.appendChild(title);

      if (sop.objective) {
        var objective = document.createElement('p');
        objective.textContent = sop.objective;
        body.appendChild(objective);
      }

      var steps = (sop.steps || []).slice().sort(function (a, b) {
        return (a.sequence || 0) - (b.sequence || 0);
      });
      if (!steps.length) {
        var empty = document.createElement('p');
        empty.textContent = 'Sin pasos definidos.';
        body.appendChild(empty);
      }
      steps.forEach(function (step) {
        var row = document.createElement('div');
        row.className = 'os-flow-item';
        row.style.alignItems = 'flex-start';

        var number = document.createElement('div');
        number.className = 'n';
        number.textContent = step.sequence || '·';
        row.appendChild(number);

        var content = document.createElement('div');
        content.style.flex = '1';
        var heading = document.createElement('b');
        heading.textContent = step.step_title || '';
        content.appendChild(heading);

        var instruction = document.createElement('div');
        instruction.style.fontSize = '12.5px';
        instruction.style.marginTop = '4px';
        instruction.innerHTML = step.instruction ? sanitizeHtml(step.instruction) : '<i>Sin instrucciones</i>';
        content.appendChild(instruction);
        row.appendChild(content);
        body.appendChild(row);
      });

      ui.modal({ title: 'Vista previa segura', body: body, wide: true, actions: [
        { label: 'Cerrar', cls: 'primary', onClick: function () { return true; } }
      ] });
    }).catch(ui.error).then(function () { trigger.disabled = false; });
  }, true);

  // Botones creados dinámicamente deben comportarse como botones, no submits.
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
        var buttons = [];
        if (node.matches && node.matches('button')) buttons.push(node);
        if (node.querySelectorAll) buttons = buttons.concat(Array.prototype.slice.call(node.querySelectorAll('button')));
        buttons.forEach(function (button) {
          if (!button.hasAttribute('type')) button.setAttribute('type', 'button');
        });
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  global.addEventListener('unhandledrejection', function (event) {
    if (ui.error && event.reason) ui.error(event.reason);
    console.error('[OS] Unhandled promise rejection', event.reason);
  });
})(window);
