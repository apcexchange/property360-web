import Script from "next/script";

export function AdSenseScript() {
  return (
    <Script
      id="google-adsense"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6961943244890229"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
