"use client";

import Script from "next/script";

/**
 * Tawk.to live-chat loader. This is the official Tawk.to embed snippet,
 * adapted to Next's <Script> so it loads after the page is interactive and
 * doesn't compete with paint / font / Tailwind delivery.
 *
 * The property + widget IDs are public client-side identifiers (they ship in
 * the browser regardless), so they're inlined here directly.
 */
const TAWK_SRC = "https://embed.tawk.to/6a3106991b898e1d419081a0/1jr7o3j78";

export function TawkChat() {
  return (
    <Script
      id="tawk-to"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
          (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='${TAWK_SRC}';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
          })();
        `,
      }}
    />
  );
}
