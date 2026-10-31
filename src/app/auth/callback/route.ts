import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 카카오 로그인 후 Supabase가 돌려보내는 주소
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/calendar`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=1`);
}
