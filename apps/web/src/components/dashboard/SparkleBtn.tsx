import { StarSVG } from './StarSVG';

export function SparkleBtn({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button className="dashboard-btn dashboard-btn-primary sparkle-btn" {...props}>
      {children}
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className={`star-${n}`}>
          <StarSVG />
        </div>
      ))}
    </button>
  );
}
