(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.VanillaModal = mod.exports;
  }
})(this, function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var _Object$prototype = Object.prototype,
      has = _Object$prototype.hasOwnProperty,
      toString = _Object$prototype.toString;

  var html = document.documentElement;

  var _ref = function () {
    var el = document.createElement("div");
    if ("transition" in el.style) {
      return ["transitionend", "transitionDuration"];
    }
    if ("OTransition" in el.style) {
      if (Number(opera.version().split(".")[0]) > 11) {
        return ["otransitionend", "OTransitionDuration"];
      }
      return ["oTransitionEnd", "OTransitionDuration"];
    }
    if ("MozTransition" in el.style) {
      return ["transitionend", "MozTransitionDuration"];
    }
    if ("WebkitTransition" in el.style) {
      return ["webkitTransitionEnd", "WebkitTransitionDuration"];
    }
    return {};
  }(),
      transitionEnd = _ref[0],
      transitionDuration = _ref[1];

  var whitespaceRegex = /\s+/;

  var defaults = {
    modal: ".modal",
    modalInner: ".modal-inner",
    modalContent: ".modal-content",
    open: "[data-modal-open]",
    close: "[data-modal-close]",
    page: "body",
    class: "modal-visible",
    loadClass: "vanilla-modal",
    clickOutside: true,
    closeKeys: [27],
    transitions: true,
    onbeforeopen: null,
    onbeforeclose: null,
    onopen: null,
    onclose: null
  };

  var instancesMap = [];
  var instanceId = "data-vanilla-id-" + Math.random().toString(32).slice(2);

  function isArray(obj) {
    return toString.call(obj) === "[object Array]";
  }

  function throwError(message) {
    console.error("VanillaModal: " + message);
  }

  function getNode(selector, parent) {
    var targetNode = parent || document;
    var node = targetNode.querySelector(selector);
    if (!node) {
      throwError(selector + " not found in document");
    }
    return node;
  }

  function trim(str) {
    var c, i, j;
    if (typeof str !== "string") return "";
    i = 0, j = str.length;
    if (!j) return "";
    while ((c = str.charCodeAt(i++)) >= 0) {
      switch (c) {
        case 9: case 10: case 11: case 12: case 13: case 32: case 65279: continue;
      }
      break;
    }
    if (i === j) return "";
    while ((c = str.charCodeAt(--j)) >= 0) {
      switch (c) {
        case 9: case 10: case 11: case 12: case 13: case 32: case 65279: continue;
      }
      break;
    }
    return --i >= ++j ? "" : str.slice(i, j);
  }

  function addClass(el, _class) {
    var attribute, classNames;
    if (!(attribute = el.getAttribute("class"))) return el.setAttribute("class", _class);
    classNames = trim(attribute).split(whitespaceRegex);
    if (classNames.indexOf(_class) >= 0) return;
    switch (classNames.length) {
      case 0: el.setAttribute("class", _class); break;
      case 1: el.setAttribute("class", classNames[0] + " " + _class); break;
      default: el.setAttribute("class", classNames.join(" ") + " " + _class);
    }
  }

  function removeClass(el, _class) {
    var attribute, classNames, len, idx;
    if (!(attribute = el.getAttribute("class"))) return;
    classNames = trim(attribute).split(whitespaceRegex);
    if (!(len = classNames.length)) return el.removeAttribute("class");
    if ((idx = classNames.indexOf(_class)) < 0) return;
    if (len === 1) return el.removeAttribute("class");
    classNames.splice(idx, 1);
    el.setAttribute("class", len > 2 ? classNames.join(" ") : classNames[0]);
  }

  function getElementContext(e) {
    if (e && typeof e.hash === "string") {
      return document.querySelector(e.hash);
    } else if (typeof e === "string") {
      return document.querySelector(e);
    }
    throwError("No selector supplied to open()");
  }

  function applyUserSettings(settings) {
    var obj = {};
    var k = void 0;
    for (k in defaults) {
      if (has.call(defaults, k)) obj[k] = defaults[k];
    }for (k in settings) {
      if (has.call(settings, k)) obj[k] = settings[k];
    }return obj;
  }

  function matches(target, selector) {
    var allMatches = target.ownerDocument.querySelectorAll(selector);
    if (!allMatches) return;
    for (var i = 0, match; match = allMatches[i++];) {
      var node = target;
      do {
        if (node === html) break;if (node === match) return node;
      } while (node = node.parentNode);
    }
  }

  function prepend(target, source) {
    var fragment = document.createDocumentFragment();
    var el = void 0;
    while (el = source.firstChild) {
      fragment.appendChild(el);
    }target.insertBefore(fragment, target.firstChild);
  }

  function getDomNodes(settings) {
    var modal = settings.modal,
        page = settings.page,
        modalInner = settings.modalInner,
        modalContent = settings.modalContent;

    var modalEl = getNode(modal);
    return {
      modal: modalEl,
      page: getNode(page),
      modalInner: getNode(modalInner, modalEl),
      modalContent: getNode(modalContent, modalEl)
    };
  }

  function hasTransition(el) {
    var css = window.getComputedStyle(el, null)[transitionDuration];
    return typeof css === "string" && parseFloat(css) > 0;
  }

  function crankshaftTryCatch(fn, context, event) {
    try {
      fn.call(context, event);
    } catch (err) {
      throwError(err);
    }
  }

  document.addEventListener("keydown", function (e) {
    var len = instancesMap.length;
    for (var i = 0; i < len; ++i) {
      var inst = instancesMap[i];
      if (inst) crankshaftTryCatch(inst.closeKeyHandler, inst, e);
    }
  }, false);

  document.addEventListener("click", function (e) {
    var len = instancesMap.length;
    var node = e.target;
    do {
      if (node === html) break;
      if (node.getAttribute(instanceId)) {
        var inst = instancesMap[node.getAttribute(instanceId)];
        if (inst) crankshaftTryCatch(inst.outsideClickHandler, inst, e);
        break;
      }
    } while (node = node.parentNode);
    for (var i = 0; i < len; ++i) {
      var _inst = instancesMap[i];
      if (_inst === null) continue;
      crankshaftTryCatch(_inst.delegateOpen, _inst, e);
      crankshaftTryCatch(_inst.delegateClose, _inst, e);
    }
  }, false);

  var VanillaModal = function () {
    function VanillaModal(settings) {
      _classCallCheck(this, VanillaModal);

      this.isOpen = this.isListening = false;
      this.current = this.instanceId = null;

      this.dom = getDomNodes(this.settings = applyUserSettings(settings));

      var len = instancesMap.length;
      for (var i = 0; i < len; ++i) {
        var inst = instancesMap[i];
        if (inst && inst.dom.modal.parentNode === null) instancesMap[i] = null;
      }

      addClass(this.dom.page, this.settings.loadClass);
      this.listen();
    }

    _createClass(VanillaModal, [{
      key: "open",
      value: function open(selector, e) {
        var page = this.dom.page;
        var _settings = this.settings,
            onbeforeopen = _settings.onbeforeopen,
            onopen = _settings.onopen,
            _class = _settings.class;

        this.releaseNode(this.current);
        this.current = getElementContext(selector);
        if (!this.current) {
          return throwError("VanillaModal target must exist on page");
        }
        if (typeof onbeforeopen === "function") {
          crankshaftTryCatch(onbeforeopen, this, e);
        }
        this.captureNode(this.current);
        addClass(page, _class);
        page.setAttribute("data-current-modal", this.current.id || "anonymous");
        this.isOpen = true;
        if (typeof onopen === "function") {
          crankshaftTryCatch(onopen, this, e);
        }
      }
    }, {
      key: "close",
      value: function close(e) {
        if (!this.isOpen) return;
        var _settings2 = this.settings,
            transitions = _settings2.transitions,
            onbeforeclose = _settings2.onbeforeclose,
            _class = _settings2.class,
            dom = this.dom;

        this.isOpen = false;
        if (typeof onbeforeclose === "function") {
          crankshaftTryCatch(onbeforeclose, this, e);
        }
        removeClass(dom.page, _class);
        if (transitions && transitionEnd && hasTransition(dom.modal)) {
          return this.closeModalWithTransition(e);
        }
        this.closeModal(e);
      }
    }, {
      key: "closeModal",
      value: function closeModal(e) {
        var onclose = this.settings.onclose;

        this.dom.page.removeAttribute("data-current-modal");
        this.releaseNode(this.current);
        this.isOpen = false;
        this.current = null;
        if (typeof onclose === "function") {
          crankshaftTryCatch(onclose, this, e);
        }
      }
    }, {
      key: "closeModalWithTransition",
      value: function closeModalWithTransition(e) {
        var that = this;
        var modal = this.dom.modal;

        function closeHandler() {
          modal.removeEventListener(transitionEnd, closeHandler, false);
          that.closeModal(e);
        }
        modal.addEventListener(transitionEnd, closeHandler, false);
      }
    }, {
      key: "captureNode",
      value: function captureNode(node) {
        if (node) prepend(this.dom.modalContent, node);
      }
    }, {
      key: "releaseNode",
      value: function releaseNode(node) {
        if (node) prepend(node, this.dom.modalContent);
      }
    }, {
      key: "closeKeyHandler",
      value: function closeKeyHandler(e) {
        var closeKeys = this.settings.closeKeys;

        if (this.isOpen && isArray(closeKeys) && closeKeys.length && closeKeys.indexOf(e.which) >= 0) {
          e.preventDefault();
          this.close(e);
        }
      }
    }, {
      key: "outsideClickHandler",
      value: function outsideClickHandler(e) {
        if (!this.settings.clickOutside) return;
        var modalInner = this.dom.modalInner;

        var node = e.target;
        do {
          if (node === html) break;if (node === modalInner) return;
        } while (node = node.parentNode);
        this.close(e);
      }
    }, {
      key: "delegateOpen",
      value: function delegateOpen(e) {
        var matchedNode = matches(e.target, this.settings.open);
        if (!matchedNode) return;
        e.preventDefault();
        this.open(matchedNode, e);
      }
    }, {
      key: "delegateClose",
      value: function delegateClose(e) {
        if (!matches(e.target, this.settings.close)) return;
        e.preventDefault();
        this.close(e);
      }
    }, {
      key: "listen",
      value: function listen() {
        if (this.isListening) return throwError("Event listeners already applied");
        this.dom.modal.setAttribute(instanceId, this.instanceId = instancesMap.push(this) - 1);
        this.isListening = true;
      }
    }, {
      key: "destroy",
      value: function destroy() {
        if (!this.isListening) return throwError("Event listeners already removed");
        this.close();
        this.instanceId = instancesMap[this.instanceId] = null;
        this.dom.modal.removeAttribute(instanceId);
        this.isListening = false;
      }
    }]);

    return VanillaModal;
  }();

  exports.default = VanillaModal;
});
