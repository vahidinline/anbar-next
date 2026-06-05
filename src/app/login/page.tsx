"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn, useSession } from "next-auth/react";
import { Button, Input, Field, Card } from "@/components/ui-kit";
import Image from "next/image";
import { registerUser } from "./actions"; // We'll create this server action

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("ایمیل و رمز عبور الزامی است");
      return;
    }
    if (password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) {
          throw new Error("ایمیل یا رمز عبور اشتباه است");
        }
        toast.success("ورود موفقیت آمیز بود");
        router.push("/");
      } else {
        const result = await registerUser(email, password);
        if (result.error) throw new Error(result.error);
        toast.success("حساب کاربری با موفقیت ساخته شد. لطفا وارد شوید.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "خطا در عملیات احراز هویت");
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    toast.error("امکان بازیابی رمز عبور در حال حاضر غیرفعال است");
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-7">
        <div className="flex flex-col items-center mb-6">
          <div className="size-20 rounded-2xl bg-white border flex items-center justify-center shadow-soft p-2">
            <Image
              src="/logo.png"
              width={64}
              height={64}
              alt="فید ایران صنعت"
              className="w-16 h-auto object-contain"
            />
          </div>
          <h1 className="mt-3 text-lg font-bold text-center">سیستم مدیریت انبار</h1>
          <p className="text-xs text-muted-foreground mt-1">فید ایران صنعت</p>
          <p className="text-[11px] text-muted-foreground/80 mt-2">طراحی و توسعه: علی میرحسینی</p>
        </div>

        <div className="flex bg-muted rounded-lg p-1 mb-5 text-sm">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 rounded-md transition-colors ${
              mode === "signin" ? "bg-card shadow-soft font-medium" : "text-muted-foreground"
            }`}
          >
            ورود
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-md transition-colors ${
              mode === "signup" ? "bg-card shadow-soft font-medium" : "text-muted-foreground"
            }`}
          >
            ثبت نام
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="ایمیل" required>
            <Input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </Field>
          <Field label="رمز عبور" required>
            <Input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "در حال پردازش..." : mode === "signin" ? "ورود به سیستم" : "ساخت حساب کاربری"}
          </Button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={forgot}
              className="block w-full text-center text-xs text-primary hover:underline"
            >
              فراموشی رمز عبور؟
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}
