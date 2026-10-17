import { cx } from '@/lib/css-module';
import styles from '@/styles/auth.module.css';

const QUOTES = [
  " 🌱 It always seems impossible until it's done.",
  ' 🚀 Well done is better than well said.',
  ' 🌍 Rejoignez la communauté',
  ' 🌟 Act as if what you do makes a difference. It does.',
  " 💡 N'oubliez pas de prendre des pauses!",
];

/** Floating quote cards around the login and register forms. */
export function AuthDecor() {
  return QUOTES.map((quote, i) => (
    <div key={quote} className={cx(styles, 'floating-card', `card-${i + 1}`)}>
      <i className="fas fa-quote-left" />
      <span>{quote}</span>
      <i className="fas fa-quote-right" />
    </div>
  ));
}
