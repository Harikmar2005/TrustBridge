import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "outline";
}

export default function Button({
    children,
    variant = "primary",
    ...props
}: Props) {
    return (
        <button
            className={`btn btn-${variant}`}
            {...props}
        >
            {children}
        </button>
    );
}