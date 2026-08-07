import type { BookConfig } from "@/config/bookConfig";
import BookCover from "./BookCover";

export default function CoverPage({ back = false, config }: { back?: boolean; config: BookConfig }) {
  return (
    <BookCover
      back={back}
      data={{
        title: config.title,
        subtitle: config.subtitle,
        author: config.author,
        displayTitleLines: config.displayTitleLines,
        coverImage: config.coverImage,
        coverImageUrl: config.coverImageUrl,
        coverStyle: config.themeSettings?.coverStyle,
        accentColor: config.themeSettings?.accentColor,
        coverDesign: config.coverDesign,
      }}
    />
  );
}
