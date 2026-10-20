import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Feedback' };

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
