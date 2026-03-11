import Link from "next/link";

const links = [
  ["/login", "Auth"],
  ["/diagnostics", "Diagnostics"],
  ["/recommendations", "Recommendations"],
  ["/dashboard", "Dashboard"],
  ["/admin", "Admin"]
] as const;

export default function HomePage() {
  return (
    <main>
      <h1>Learn-nGrow Baseline</h1>
      <p>Use the routes below to validate the initial app structure.</p>
      <ul>
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
