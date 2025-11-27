import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Meta tags */}
        <meta name="theme-color" content="#0b0f19" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="YukiChat — AI Powered Telegram Bot Control Panel" />

        {/* Inter Font (Fast + optimized) */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <body className="bg-[#0b0f19] text-white antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
