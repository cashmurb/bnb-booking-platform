import Image from "next/image";
import type { ReactNode } from "react";

export function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Image
        src="/images/login-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#0e1430]/55" />

      <h1 className="absolute top-12 left-1/2 z-10 -translate-x-1/2 font-serif text-2xl text-white/90">
        WnJ Management
      </h1>

      {children}
    </main>
  );
}
