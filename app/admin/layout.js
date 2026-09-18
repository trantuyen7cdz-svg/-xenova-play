"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminLayout({ children }) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, email, role")
            .eq("id", user.id)
            .maybeSingle();

        if (
          profileError ||
          !profile ||
          profile.role !== "admin"
        ) {
          router.replace("/dashboard");
          return;
        }

        if (mounted) {
          setAllowed(true);
          setChecking(false);
        }
      } catch (error) {
        console.error("ADMIN CHECK ERROR:", error);
        router.replace("/dashboard");
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#070707",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Đang kiểm tra quyền Admin...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return children;
}
