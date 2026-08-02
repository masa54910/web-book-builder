import Link from "next/link";

export default function HomeBackLink({ label = "← ホームへ戻る" }: { label?: string }) {
  return (
    <Link className="maker-secondary-link home-back-link" href="/">
      {label}
    </Link>
  );
}
