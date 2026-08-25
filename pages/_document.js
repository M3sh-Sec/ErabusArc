import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Security meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Prevent search engine indexing of the tool (optional — remove if you want SEO) */}
        <meta name="robots" content="noindex, nofollow" />

        {/* Branding */}
        <meta name="description" content="EREBUS ARC — Professional Vulnerability Intelligence Platform" />
        <meta name="theme-color" content="#07090f" />

        {/* Fonts — loaded from Google with integrity */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
