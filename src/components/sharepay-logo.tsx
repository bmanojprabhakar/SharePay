export default function SharePayLogo() {
  return (
    <svg
      width="190"
      height="40"
      viewBox="0 0 190 40"
      className="text-4xl font-bold"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))' }} />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="url(#logo-gradient)"
      >
        SharePay
      </text>
    </svg>
  );
}
