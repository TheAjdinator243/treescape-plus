/**
 * Ikone sadržaja — ručno pisani SVG-ovi umjesto biblioteke.
 *
 * Stoje zasebno jer ih koriste oba izgleda sajta. Crtaju se `currentColor`-om
 * i bez ispune, pa se boje same po tekstu oko sebe — ista datoteka radi i na
 * tamnoj i na svijetloj podlozi.
 */
export function AmenityIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'pool':
      return (
        <svg {...common}>
          {/* voda u valovima + ljestve bazena */}
          <path d="M3 16c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2" />
          <path d="M3 20c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2" />
          <path d="M8 14V5.5A2.5 2.5 0 0 1 10.5 3M16 14V5.5A2.5 2.5 0 0 1 18.5 3M8 8h8" />
        </svg>
      );
    case 'fountain':
      return (
        <svg {...common}>
          {/* mlaz vode iz šadrvana koji pada u bazenčić */}
          <path d="M12 3v7M12 3c-1.4 0-2.5 1-2.5 2M12 3c1.4 0 2.5 1 2.5 2" />
          <path d="M7 10h10l-1.2 5H8.2L7 10Z" />
          <path d="M4 19c1.6 0 1.6 1.3 3.2 1.3S8.8 19 10.4 19s1.6 1.3 3.2 1.3S15.2 19 16.8 19s1.6 1.3 3.2 1.3" />
        </svg>
      );
    case 'wifi':
      return (
        <svg {...common}>
          <path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg {...common}>
          <path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M18 3c-1.5 1-2 3-2 5s.5 3 2 3v10" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...common}>
          <path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.7-4 .3 1 .9 1.7 1.6 2 .3-2.6-.1-5 1.7-7Z" />
        </svg>
      );
    case 'grill':
      return (
        <svg {...common}>
          <path d="M4 7h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8ZM9 15l-2 6M15 15l2 6" />
        </svg>
      );
    case 'car':
      return (
        <svg {...common}>
          <path d="M5 17h14M4 17v-4l2-5h12l2 5v4M4 17v2h3v-2M17 17v2h3v-2" />
          <circle cx="7.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'heat':
      return (
        <svg {...common}>
          <path d="M12 3v12M8 6v9M16 6v9M6 19h12" />
          <circle cx="12" cy="18" r="2.5" />
        </svg>
      );
    case 'washer':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <path d="M8 6.5h.01M11 6.5h.01" />
        </svg>
      );
    case 'tv':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8" />
        </svg>
      );
    case 'pet':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="1.8" />
          <circle cx="16" cy="8" r="1.8" />
          <circle cx="5" cy="13" r="1.6" />
          <circle cx="19" cy="13" r="1.6" />
          <path d="M12 12c2.5 0 4.5 2 4.5 4.2S14.8 20 12 20s-4.5-1.6-4.5-3.8S9.5 12 12 12Z" />
        </svg>
      );
    case 'tree':
      return (
        <svg {...common}>
          <path d="M12 3 6 12h3l-4 6h14l-4-6h3L12 3ZM12 18v3" />
        </svg>
      );
    case 'coffee':
      return (
        <svg {...common}>
          <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9ZM17 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2" />
        </svg>
      );
    case 'towel':
      return (
        <svg {...common}>
          <path d="M6 4h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4ZM6 9h12" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
