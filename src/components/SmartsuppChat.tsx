"use client";

import Script from "next/script";

/**
 * Smartsupp live-chat loader, adapted to Next's <Script> so it loads after the
 * page is interactive and doesn't compete with paint / font / Tailwind delivery.
 *
 * NOTE: we deliberately do NOT use Smartsupp's stock `window.smartsupp||(...)`
 * guard. In this app `window.smartsupp` is already a truthy (empty) object by
 * the time the snippet runs, so that guard short-circuits and the loader script
 * is never injected (widget never appears). Instead we set the queue function
 * explicitly and inject the loader once, gated on our own flag so HMR / double
 * renders don't load it twice.
 *
 * The key is a public client-side identifier (it ships in the browser
 * regardless), so it's inlined here directly.
 */
const SMARTSUPP_KEY = "e43ede4fe38e471eb3ec99c5adf9989065afdba0";

export function SmartsuppChat() {
  return (
    <Script
      id="smartsupp"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function (d) {
            if (window.__smartsuppLoaded) return;
            window.__smartsuppLoaded = true;
            window._smartsupp = window._smartsupp || {};
            window._smartsupp.key = '${SMARTSUPP_KEY}';
            var o = (window.smartsupp = function () { o._.push(arguments); });
            o._ = [];
            var s = d.getElementsByTagName('script')[0];
            var c = d.createElement('script');
            c.type = 'text/javascript';
            c.charset = 'utf-8';
            c.async = true;
            c.src = 'https://www.smartsuppchat.com/loader.js?';
            s.parentNode.insertBefore(c, s);
          })(document);
        `,
      }}
    />
  );
}
