export default function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Soft-edged shield in the theme ink; voice bars are a canvas cutout,
          and the dot on top is the brand accent (a small "voice indicator"). */}
      <path
        d="M16 2C9.6 2 5.6 4.5 5.6 8.6v5.7c0 7.6 4.5 13.1 10.4 16 5.9-2.9 10.4-8.4 10.4-16V8.6C26.4 4.5 22.4 2 16 2z"
        fill="currentColor"
      />
      <circle cx="16" cy="8.4" r="1.5" fill="var(--vs-accent)" />
      <rect x="11.1" y="15.4" width="2.8" height="5.4" rx="1.4" fill="var(--vs-bg)" />
      <rect x="14.6" y="11.6" width="2.8" height="11.2" rx="1.4" fill="var(--vs-bg)" />
      <rect x="18.1" y="15.4" width="2.8" height="5.4" rx="1.4" fill="var(--vs-bg)" />
    </svg>
  );
}
