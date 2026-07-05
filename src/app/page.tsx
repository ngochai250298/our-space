"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import type { Session } from "@/types";
import { getSession, login } from "@/lib/auth";
import { WelcomeTransition } from "@/features/auth/WelcomeTransition";

const loginSchema = z.object({
  username: z.string().min(1, "Nhập tên của bạn nhé"),
  password: z.string().min(1, "Nhập mật khẩu nhé"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Already signed in → straight home.
  useEffect(() => {
    if (getSession()) router.replace("/home");
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    const result = await login(values.username, values.password);
    if (!result) {
      setLoginError("Mật khẩu chưa đúng.");
      return;
    }
    setLoginError("");
    setSession(result);
  };

  return (
    <AnimatePresence mode="wait">
      {session ? (
        <WelcomeTransition
          key="welcome"
          session={session}
          onDone={() => router.replace("/home")}
        />
      ) : (
        <motion.main
          key="login"
          className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <span className="animate-float-soft text-5xl" aria-hidden>
            ❤️
          </span>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Our Space
          </h1>
          <p className="mt-2 text-sm font-medium text-primary-strong">
            Chào mừng về nhà.
          </p>

          <p className="mt-6 text-center text-sm leading-relaxed text-muted">
            &ldquo;Khoảng cách chỉ là bản đồ,
            <br />
            còn trái tim vẫn ở cạnh nhau.&rdquo;
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 w-full space-y-4"
            noValidate
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Username</span>
              <input
                {...register("username")}
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Nhập tên của bạn"
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none transition-all duration-300 placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
              {errors.username && (
                <span className="text-xs text-primary-strong">
                  {errors.username.message}
                </span>
              )}
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Password</span>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3 pr-11 text-sm outline-none transition-all duration-300 placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary-soft"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 grid place-items-center text-muted"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-primary-strong">
                  {errors.password.message}
                </span>
              )}
            </label>

            {loginError && (
              <p className="text-center text-sm text-primary-strong">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary-strong active:scale-[0.98]"
            >
              ❤️ Về với nhau
            </button>
          </form>

          <p className="mt-10 text-xs text-muted">&ldquo;Only for Bình &amp; family&rdquo;</p>
        </motion.main>
      )}
    </AnimatePresence>
  );
}
