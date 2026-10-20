import { useCallback, useRef, useState } from 'react';
import type { FeedbackType } from './pronunciation';

export interface Feedback {
  text: string;
  /** `null` until a colour is first set; omitting the type on update keeps the current colour. */
  type: FeedbackType | null;
}

export type SetFeedback = (text: string, type?: FeedbackType) => void;

export function useFeedback() {
  const [feedback, setState] = useState<Feedback>({ text: '', type: null });
  const textRef = useRef('');

  const setFeedback: SetFeedback = useCallback((text, type) => {
    textRef.current = text;
    setState((prev) => ({ text, type: type ?? prev.type }));
  }, []);

  const getFeedbackText = useCallback(() => textRef.current, []);

  return { feedback, setFeedback, getFeedbackText };
}
