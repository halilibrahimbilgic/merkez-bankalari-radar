"use client";

// Kök düzen çökerse devreye girer ve düzenin yerine geçer: kendi <html>'i,
// stili ve iki dili var (hangi dilde olunduğu bu noktada bilinmiyor).
// Stil satır içi ve sistem renk düzenine uyar; globals.css bu belgeye gelmez.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="tr">
      <body>
        <style>{`
          body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
            font-family:system-ui,sans-serif;background:#fff;color:#111;padding:1rem}
          main{max-width:32rem}
          h1{font-size:1.5rem;margin:0 0 .5rem}
          p{margin:.5rem 0;line-height:1.5}
          a,button{font:inherit;color:inherit;border:1px solid currentColor;border-radius:.375rem;
            padding:.4rem .8rem;background:none;text-decoration:none;cursor:pointer;margin-right:.5rem}
          @media (prefers-color-scheme:dark){body{background:#0b0b0c;color:#eee}}
        `}</style>
        <main>
          <h1>Bir şeyler ters gitti</h1>
          <p>Sayfa şu an gösterilemiyor. Tekrar deneyebilir ya da ana sayfaya dönebilirsiniz.</p>
          <p lang="en">Something went wrong. You can try again or go back to the home page.</p>
          <p>
            <button type="button" onClick={() => retry()}>
              Tekrar dene / Try again
            </button>
            {/* Düzen çöktü: istemci gezinmesi yerine tam sayfa yükleme istenir. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Ana sayfa / Home</a>
          </p>
        </main>
      </body>
    </html>
  );
}
