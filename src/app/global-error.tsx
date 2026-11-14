"use client";

/** Last-resort error screen (root layout failed). Inline styles: global CSS may not be loaded here. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#4ade80", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 16 }}>
        <div>
          <h1 style={{ color: "#86efac", fontSize: 24 }}>Something went wrong</h1>
          <p style={{ color: "#6fbf8a" }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 16, background: "#22c55e", color: "#04140a", border: 0, borderRadius: 6, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
