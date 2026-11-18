import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F8FB] px-4 text-center">
      <p className="font-mono text-sm font-bold text-[#167C91]">404</p>
      <h1 className="mt-2 text-3xl font-bold text-[#102A3A]">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-[#64748B]">
        The page you requested does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-[#167C91] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#105E6F]"
      >
        Return to Home
      </Link>
    </div>
  );
}