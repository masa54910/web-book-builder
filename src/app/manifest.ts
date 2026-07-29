import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WebBookMaker",
    short_name: "WebBookMaker",
    description: "文章からページめくり付きWeb書籍を作成するベータサービス",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0e5",
    theme_color: "#174a48",
  };
}
