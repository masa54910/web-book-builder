import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { error: "Supabase環境変数が未設定です。" },
      { status: 503 },
    );
  }

  if (!serviceRole) {
    return NextResponse.json(
      {
        error:
          "アカウント削除APIのサーバー設定が不足しています。SUPABASE_SERVICE_ROLE_KEY を設定してください。",
      },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "認証トークンがありません。" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "認証確認に失敗しました。再ログインしてください。" }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
  if (deleteError) {
    return NextResponse.json({ error: "アカウント削除に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ message: "アカウントを削除しました。" });
}
