import { Link } from "@tanstack/react-router";

export function KeepLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
      Loading this round…
    </div>
  );
}

export function KeepMissing() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg text-muted">
      <p>That session is gone.</p>
      <Link to="/" className="text-fg underline">
        Back to Keep
      </Link>
    </div>
  );
}
