import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TABLES } from "@/utils/constants";

export type ApiAuthUser = {
  id: string;
  role: string;
};

export async function getApiAuthUser(): Promise<ApiAuthUser | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUser = session?.user ?? null;
  if (!authUser?.id) return null;

  let role = authUser.user_metadata?.role || authUser.app_metadata?.role;

  if (!role) {
    const { data: userData } = await supabase
      .from(TABLES.USERS)
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();

    role = userData?.role;
  }

  return {
    id: authUser.id,
    role: role || "student",
  };
}

export async function requireApiRoles(allowedRoles: string[]) {
  const user = await getApiAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return { user };
}
