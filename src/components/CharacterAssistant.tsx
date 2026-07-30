"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  defaultCharacterMessage,
  pickCharacterMessage,
  type CharacterEventType,
  type CharacterMessage,
} from "@/lib/characterEvents";

const characterImage = {
  mio: "/characters/shiori-bust.png",
  booky: "/characters/booky-bust.png",
} satisfies Record<CharacterMessage["speaker"], string>;

const characterName = {
  mio: "編集アシスタント しおり",
  booky: "編集部猫 ブッキー",
} satisfies Record<CharacterMessage["speaker"], string>;

export default function CharacterAssistant({
  event = "welcome",
  compact = false,
}: {
  event?: CharacterEventType;
  compact?: boolean;
}) {
  const [message, setMessage] = useState<CharacterMessage>(() => defaultCharacterMessage(event));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessage(pickCharacterMessage(event));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [event]);

  return (
    <aside className={`character-assistant ${compact ? "compact" : ""} mood-${message.mood}`}>
      <div className={`character-avatar ${message.speaker}`}>
        <Image
          src={characterImage[message.speaker]}
          alt={characterName[message.speaker]}
          width={message.speaker === "mio" ? 130 : 120}
          height={message.speaker === "mio" ? 142 : 130}
          priority={event === "welcome"}
        />
      </div>
      <div className="character-balloon">
        <strong>{characterName[message.speaker]}</strong>
        <p>{message.message}</p>
      </div>
    </aside>
  );
}
