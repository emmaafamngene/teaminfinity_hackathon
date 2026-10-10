import Link from "next/link";
export default function Forbidden() {
  return (
    <main className="status-page p-10">
      <h1>Access restricted</h1>
      <p>Your account does not have access to this workspace.</p>
      <Link href="/marketplace">Return to marketplace →</Link>
    </main>
  );
}
