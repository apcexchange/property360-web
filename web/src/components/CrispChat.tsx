"use client";

import Script from "next/script";

/**
 * Crisp live-chat loader. Inert when NEXT_PUBLIC_CRISP_WEBSITE_ID is
 * missing — that lets dev / preview deploys stay quiet while production
 * loads the widget. Picks up the website ID at build time (it's a
 * NEXT_PUBLIC_ var, so it's safe to inline).
 *
 * Strategy `afterInteractive` so it doesn't compete with paint or
 * delay font/Tailwind delivery; Crisp's bootstrap is a small inline
 * script + a deferred external script, so this lines up cleanly.
 */
export function CrispChat() {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
  if (!websiteId) return null;

  return (
    <Script
      id="crisp-chat"
      strategy="afterInteractive"
      // The official Crisp bootstrap snippet — declares window.$crisp +
      // CRISP_WEBSITE_ID, then injects the real loader. Identifier is
      // baked in by Next at build time from the env var.
      dangerouslySetInnerHTML={{
        __html: `
          window.$crisp=[];
          window.CRISP_WEBSITE_ID=${JSON.stringify(websiteId)};
          (function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        `,
      }}
    />
  );
}
