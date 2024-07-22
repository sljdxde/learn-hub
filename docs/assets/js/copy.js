!(function () {
  "use strict";
  function e(o) {
    return (
      (e =
        "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
          ? function (e) {
              return typeof e;
            }
          : function (e) {
              return e &&
                "function" == typeof Symbol &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? "symbol"
                : typeof e;
            }),
      e(o)
    );
  }
  !(function (e, o) {
    void 0 === o && (o = {});
    var t = o.insertAt;
    if (e && "undefined" != typeof document) {
      var n = document.head || document.getElementsByTagName("head")[0],
        c = document.createElement("style");
      (c.type = "text/css"),
        "top" === t && n.firstChild
          ? n.insertBefore(c, n.firstChild)
          : n.appendChild(c),
        c.styleSheet
          ? (c.styleSheet.cssText = e)
          : c.appendChild(document.createTextNode(e));
    }
  })(
    ".docsify-copy-code-button,.docsify-copy-code-button>span{cursor:pointer;transition:all .25s ease}.docsify-copy-code-button{background:grey;background:var(--theme-color,grey);border:0;border-radius:5px;color:#fff;font-size:1em;opacity:0;outline:0;overflow:visible;padding:.55em .7em;position:absolute;right:0;top:0;z-index:1}.docsify-copy-code-button>span{background:inherit;border-radius:3px;pointer-events:none}.docsify-copy-code-button>.error,.docsify-copy-code-button>.success{font-size:.825em;opacity:0;padding:.5em .65em;position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:-100}.docsify-copy-code-button.error>.error,.docsify-copy-code-button.success>.success{opacity:1;right:100%;transform:translate(-25%,-50%)}.docsify-copy-code-button:focus,pre:hover .docsify-copy-code-button{opacity:1}.docsify-copy-code-button>[aria-live]{height:1px;left:-10000px;overflow:hidden;position:absolute;top:auto;width:1px};border-radius:5px;"
  ),
    document.querySelector('link[href*="docsify-copy-code"]') &&
      console.warn(
        "[Deprecation] Link to external docsify-copy-code stylesheet is no longer necessary."
      ),
    (window.DocsifyCopyCodePlugin = {
      init: function () {
        return function (e, o) {
          e.ready(function () {
            console.warn(
              "[Deprecation] Manually initializing docsify-copy-code using window.DocsifyCopyCodePlugin.init() is no longer necessary."
            );
          });
        };
      },
    }),
    (window.$docsify = window.$docsify || {}),
    (window.$docsify.plugins = [
      function (o, t) {
        var n = {
          buttonText: "复制代码",
          errorText: "Error",
          successText: "已复制",
        };
        o.doneEach(function () {
          var o = Array.from(document.querySelectorAll("pre[data-lang]"));
          t.config.copyCode &&
            Object.keys(n).forEach(function (o) {
              var c = t.config.copyCode[o];
              "string" == typeof c
                ? (n[o] = c)
                : "object" === e(c) &&
                  Object.keys(c).some(function (e) {
                    var t = location.href.indexOf(e) > -1;
                    return (n[o] = t ? c[e] : n[o]), t;
                  });
            });
          var c = [
            '<button class="docsify-copy-code-button"> ',
            '<span class="label">'.concat(n.buttonText, "</span>"),
            '<span class="error" aria-hidden="hidden">'.concat(
              n.errorText,
              "</span>"
            ),
            '<span class="success" aria-hidden="hidden">'.concat(
              n.successText,
              "</span>"
            ),
            '<span aria-live="polite"></span>',
            "</button>",
          ].join("");
          o.forEach(function (e) {
            e.insertAdjacentHTML("beforeend", c);
          });
        }),
          o.mounted(function () {
            var e = document.querySelector(".content");
            e &&
              e.addEventListener("click", function (e) {
                if (e.target.classList.contains("docsify-copy-code-button")) {
                  var o =
                      "BUTTON" === e.target.tagName
                        ? e.target
                        : e.target.parentNode,
                    t = document.createRange(),
                    c = o.parentNode.querySelector("code"),
                    i = o.querySelector("[aria-live]"),
                    r = window.getSelection();
                  t.selectNode(c), r && (r.removeAllRanges(), r.addRange(t));
                  try {
                    document.execCommand("copy") &&
                      (o.classList.add("success"),
                      (i.innerText = n.successText),
                      setTimeout(function () {
                        o.classList.remove("success"), (i.innerText = "");
                      }, 1e3));
                  } catch (e) {
                    console.error("docsify-copy-code: ".concat(e)),
                      o.classList.add("error"),
                      (i.innerText = n.errorText),
                      setTimeout(function () {
                        o.classList.remove("error"), (i.innerText = "");
                      }, 1e3);
                  }
                  (r = window.getSelection()) &&
                    ("function" == typeof r.removeRange
                      ? r.removeRange(t)
                      : "function" == typeof r.removeAllRanges &&
                        r.removeAllRanges());
                }
              });
          });
      },
    ].concat(window.$docsify.plugins || []));
})();