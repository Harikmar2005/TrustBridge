import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface LogoProps {
  light?: boolean;
  to?: string;
}

export default function Logo({ light = false, to = "/" }: LogoProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 font-bold tracking-tight text-lg ${
        light ? "text-white" : "text-[#102A3A]"
      }`}
    >
      <ShieldCheck
        className={`h-6 w-6 shrink-0 ${light ? "text-[#58C4D4]" : "text-[#167C91]"}`}
        aria-hidden="true"
      />
      <span>TrustBridge</span>
    </Link>
  );
}