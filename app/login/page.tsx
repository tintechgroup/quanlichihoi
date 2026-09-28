"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Đăng nhập không thành công");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center px-5 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#12345B] text-sm font-bold text-white">
              LCH
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#12345B]">
                Trường Đại học Quy Nhơn
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Liên Chi hội Khoa Sư phạm
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center px-5 py-10 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex min-h-[560px] flex-col justify-between bg-[#12345B] p-8 text-white sm:p-12 lg:p-16">
            <div>
              <div className="mb-10 h-1 w-16 bg-[#D7B45A]" />

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Hệ thống thông tin
              </p>

              <h1 className="mt-5 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
                Hệ thống quản lý Liên Chi hội Khoa Sư phạm
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-200">
                Quản lý tập trung thông tin Chi hội, Hội viên, hoạt động,
                văn kiện, thông báo và các nghiệp vụ của Liên Chi hội.
              </p>
            </div>

            <div className="mt-12 border-t border-white/20 pt-6">
              <p className="text-sm leading-6 text-slate-300">
                Vui lòng sử dụng tài khoản đã được cấp để truy cập hệ thống.
              </p>
            </div>
          </div>

          <div className="flex min-h-[560px] items-center p-8 sm:p-12 lg:p-16">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-9">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#12345B]">
                  Khu vực đăng nhập
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900">
                  Đăng nhập hệ thống
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Nhập thông tin tài khoản để tiếp tục.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Tên đăng nhập
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Mật khẩu
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12345B] focus:ring-2 focus:ring-[#12345B]/15"
                    required
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center rounded-md bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0C2949] focus:outline-none focus:ring-2 focus:ring-[#12345B] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </form>

              <p className="mt-8 text-center text-xs leading-5 text-slate-500">
                Tài khoản được cấp và quản lý bởi Quản trị viên hệ thống.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}