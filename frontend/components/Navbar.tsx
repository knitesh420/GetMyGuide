import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-md py-4 px-8 flex items-center justify-between">
      <div className="text-xl font-bold text-blue-600">
        <Link href="/">BookMyTourGuide</Link>
      </div>
      <div className="space-x-6">
        <Link href="/">Home</Link>
        <Link href="/location">Locations</Link>
        <Link href="/register-guide">Register Guide</Link>
        <Link href="/register-tourist">Register Tourist</Link>
        <Link href="/dashboard">Dashboard</Link>
      </div>
    </nav>
  );
}
