import "server-only";
import { cache } from "react";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";

interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
}

export const getCurrentUser = cache(
  async (): Promise<{ id: string | null; email: string | null; name: string | null; avatarUrl: string | null }> => {
    const supabase = await supabaseServerAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const metadata = (user?.user_metadata ?? {}) as UserMetadata;
    return {
      id: user?.id ?? null,
      email: user?.email ?? null,
      name: metadata.full_name ?? null,
      avatarUrl: metadata.avatar_url ?? null,
    };
  }
);
