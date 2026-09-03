"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import StatusMessage from "@/components/ui/StatusMessage";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AuthorSellerProfileInput, SellerType, StripeConnectionStatus } from "@/lib/sellerConnect";

const emptyProfile: AuthorSellerProfileInput = {
  userId: "",
  sellerType: "individual",
  legalName: "",
  tradeName: "",
  representativeName: "",
  countryCode: "JP",
  postalCode: "",
  region: "",
  city: "",
  addressLine1: "",
  addressLine2: "",
  phone: "",
  supportEmail: "",
};

type ApiResult = { profile?: AuthorSellerProfileInput; readiness?: StripeConnectionStatus; consent?: { termsVersion?: string }; currentTermsVersion?: string; url?: string; error?: string };

export default function SellerConnectPanel() {
  const { user, authMode } = useAuth();
  const [profile, setProfile] = useState<AuthorSellerProfileInput>(emptyProfile);
  const [readiness, setReadiness] = useState<StripeConnectionStatus | null>(null);
  const [termsVersion, setTermsVersion] = useState("gate18c4-v1");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const accessToken = async () => {
    const client = getSupabaseClient();
    if (!client) return "";
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? "";
  };

  const request = useCallback(async (path: string, init?: RequestInit): Promise<ApiResult> => {
    const token = await accessToken();
    if (!token) throw new Error("ログイン状態を確認できません。再ログインしてください。");
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "処理に失敗しました。");
    return result as ApiResult;
  }, []);

  useEffect(() => {
    if (!user || authMode !== "supabase") return;
    let active = true;
    Promise.all([request("/api/connect/profile"), request("/api/connect/status"), request("/api/connect/consent")])
      .then(([profileResult, statusResult, consentResult]) => {
        if (!active) return;
        if (profileResult.profile) setProfile({ ...emptyProfile, ...profileResult.profile });
        setReadiness(statusResult.readiness ?? null);
        setTermsVersion(consentResult.currentTermsVersion ?? "gate18c4-v1");
        setConsentAccepted(consentResult.consent?.termsVersion === (consentResult.currentTermsVersion ?? "gate18c4-v1"));
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "販売者情報を読み込めませんでした。"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authMode, request, user]);

  const update = <K extends keyof AuthorSellerProfileInput>(key: K, value: AuthorSellerProfileInput[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await request("/api/connect/profile", { method: "POST", body: JSON.stringify(profile) });
      if (result.profile) setProfile({ ...emptyProfile, ...result.profile });
      setMessage("販売者情報を保存しました。Stripe本人確認を開始できます。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "販売者情報を保存できませんでした。");
    } finally { setSaving(false); }
  };

  const startOnboarding = async () => {
    if (!consentAccepted) { setError("販売条件への同意を保存してから本人確認を開始してください。"); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await request("/api/connect/onboarding", { method: "POST", body: "{}" });
      if (result.url) window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Stripe本人確認を開始できませんでした。");
    } finally { setSaving(false); }
  };

  const labels = useMemo(() => ({ individual: "個人", company: "法人" }) satisfies Record<SellerType, string>, []);
  if (authMode !== "supabase" || !user) return null;

  return (
    <section className="maker-card seller-connect-panel">
      <h2>販売者情報とStripe接続</h2>
      <p>Webブックの販売を始めるには、販売者情報を入力してStripeの安全な本人確認を完了してください。</p>
      {loading ? <p className="maker-note">販売者情報を読み込んでいます…</p> : (
        <>
          <div className="maker-grid">
            <label><span>販売者区分</span><select value={profile.sellerType} onChange={(e) => update("sellerType", e.target.value as SellerType)}>{(Object.keys(labels) as SellerType[]).map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select></label>
            <label><span>氏名 / 法人名</span><input value={profile.legalName} onChange={(e) => update("legalName", e.target.value)} /></label>
            <label><span>屋号（任意）</span><input value={profile.tradeName} onChange={(e) => update("tradeName", e.target.value)} /></label>
            {profile.sellerType === "company" ? <label><span>代表者名</span><input value={profile.representativeName} onChange={(e) => update("representativeName", e.target.value)} /></label> : null}
            <label><span>国コード</span><input maxLength={2} value={profile.countryCode} onChange={(e) => update("countryCode", e.target.value.toUpperCase())} /></label>
            <label><span>郵便番号</span><input value={profile.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></label>
            <label><span>都道府県</span><input value={profile.region} onChange={(e) => update("region", e.target.value)} /></label>
            <label><span>市区町村</span><input value={profile.city} onChange={(e) => update("city", e.target.value)} /></label>
            <label><span>住所</span><input value={profile.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} /></label>
            <label><span>住所（建物名・任意）</span><input value={profile.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} /></label>
            <label><span>電話番号</span><input type="tel" value={profile.phone} onChange={(e) => update("phone", e.target.value)} /></label>
            <label><span>サポート用メール</span><input type="email" value={profile.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} /></label>
          </div>
          <label className="checkbox-label seller-consent-check"><input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} /><span>販売者として販売条件に同意します（WebBookMakerは制作・配信・Stripe連携を提供し、購入者との売買条件・返金対応は販売者が管理します）。</span></label>
          <div className="maker-actions"><Button loading={saving} onClick={() => void saveProfile()}>販売者情報を保存</Button><Button variant="secondary" disabled={saving || !consentAccepted} onClick={() => void request("/api/connect/consent", { method: "POST", body: JSON.stringify({ accepted: true, termsVersion }) }).then(() => setMessage("販売条件への同意を保存しました。")).catch((reason) => setError(reason instanceof Error ? reason.message : "同意を保存できませんでした。"))}>販売同意を保存</Button><Button variant="secondary" disabled={saving || !consentAccepted} onClick={() => void startOnboarding()}>Stripe本人確認を開始</Button></div>
          {readiness ? <p className="maker-note">接続状況：{readiness.connected ? readiness.merchantActive ? "確認済み" : "確認中" : "未接続"}</p> : null}
        </>
      )}
      {error ? <StatusMessage variant="error" message={error} className="form-error" /> : null}
      {message ? <StatusMessage variant="success" message={message} className="maker-status" /> : null}
    </section>
  );
}
