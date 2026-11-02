'use client';

import { useEffect, useState } from 'react';

export function TypingText({ text, delay = 50 }: { text: string; delay?: number }) {
  const [typed, setTyped] = useState({ text, length: 0 });
  // Restart when the text changes (state adjusted during render, not in an effect)
  if (typed.text !== text) setTyped({ text, length: 0 });

  useEffect(() => {
    let length = 0;
    const timer = setInterval(() => {
      length++;
      setTyped({ text, length });
      if (length >= text.length) clearInterval(timer);
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);

  return <span className="typing-text">{text.slice(0, typed.length)}</span>;
}
