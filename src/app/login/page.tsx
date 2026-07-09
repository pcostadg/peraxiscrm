import Image from "next/image"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] p-5">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,23,42,0.05),rgba(37,99,235,0.08),rgba(255,255,255,0.2))]" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute left-[-12%] top-1/4 h-64 w-[130%] rotate-[-8deg] bg-white/60 blur-3xl motion-safe:animate-[loginSweep_8s_ease-in-out_infinite]" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/80 bg-white/82 p-7 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl motion-safe:animate-[loginCard_650ms_ease-out_both] sm:p-9">
        <div className="mb-9 flex justify-center">
          <Image
            src="/logo.png"
            alt="Peraxis"
            width={230}
            height={80}
            className="h-auto w-[230px] motion-safe:animate-[logoFloat_4.8s_ease-in-out_infinite]"
            priority
          />
        </div>

        <LoginForm />
      </section>
    </main>
  )
}
