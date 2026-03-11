import type { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 8,
        border: "1px solid #cbd5e1",
        padding: "0.5rem 0.875rem",
        background: "#ffffff",
        cursor: "pointer"
      }}
    />
  );
}
