"use client";

import { useEffect, useState } from "react";
import { pickCharacterMessage, type CharacterEventType, type CharacterMessage } from "@/lib/characterEvents";

export default function CharacterAssistant({
  event = "welcome",
  compact = false,
}: {
  event?: CharacterEventType;
  compact?: boolean;
}) {
  const [message, setMessage] = useState<CharacterMessage>(() => pickCharacterMessage(event));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessage(pickCharacterMessage(event));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [event]);

  return (
    <aside className={`character-assistant ${compact ? "compact" : ""} mood-${message.mood}`}>
      <div className={`character-avatar ${message.speaker}`}>
        <span className="character-face">{message.speaker === "mio" ? "ミオ" : "🐾"}</span>
      </div>
      <div className="character-balloon">
        <strong>{message.speaker === "mio" ? "編集アシスタント ミオ" : "編集部猫 ブッキー"}</strong>
        <p>{message.message}</p>
      </div>
    </aside>
  );
}
