import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="h-full antialiased">
      <Head>
        <title>Media Tools</title>
        <meta
          name="description"
          content="Convert, split, and merge your media files"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body className="min-h-full flex flex-col">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
