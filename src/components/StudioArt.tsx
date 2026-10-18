export function StudioMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M20 3v34M3 20h34M8 8l24 24M8 32 32 8" />
      </g>
      <circle cx="20" cy="20" r="4.5" fill="currentColor" />
    </svg>
  );
}
export function StudioArt() {
  return (
    <svg className="studio-art" viewBox="0 0 330 240" aria-hidden="true">
      <defs>
        <pattern
          id="art-grid"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M22 0H0V22"
            fill="none"
            stroke="#b9ad95"
            strokeWidth=".5"
            opacity=".32"
          />
        </pattern>
        <linearGradient id="sphere" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d4deca" />
          <stop offset="1" stopColor="#8d9e7e" />
        </linearGradient>
        <linearGradient id="book" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d8a594" />
          <stop offset="1" stopColor="#bd8a76" />
        </linearGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <rect x="15" y="8" width="295" height="220" fill="url(#art-grid)" />
      <ellipse
        cx="172"
        cy="202"
        rx="112"
        ry="13"
        fill="#8b7050"
        opacity=".12"
        filter="url(#shadow)"
      />
      <g transform="rotate(-12 225 132)">
        <rect x="177" y="58" width="104" height="144" rx="5" fill="#a97968" />
        <path d="M183 58h94v137h-94" fill="#fff9ee" />
        <path
          d="M183 65h94M183 70h94M183 75h94"
          stroke="#e5d8c7"
          strokeWidth="1"
        />
        <rect
          x="170"
          y="48"
          width="105"
          height="142"
          rx="4"
          fill="url(#book)"
        />
        <path d="M181 48v142" stroke="#ae7964" strokeWidth="1.5" />
        <path d="M200 74h48M200 79h36" stroke="#f8e6d6" strokeWidth="1.8" />
        <text
          x="204"
          y="123"
          fill="#fae9d8"
          fontFamily="Georgia, serif"
          fontSize="31"
          fontStyle="italic"
        >
          ƒ(x)
        </text>
        <path d="M201 164h43" stroke="#f8e6d6" strokeWidth="1.3" />
      </g>
      <circle cx="106" cy="137" r="58" fill="url(#sphere)" />
      <ellipse
        cx="106"
        cy="137"
        rx="26"
        ry="58"
        fill="none"
        stroke="#73866b"
        strokeWidth=".8"
        opacity=".58"
      />
      <ellipse
        cx="106"
        cy="137"
        rx="58"
        ry="22"
        fill="none"
        stroke="#73866b"
        strokeWidth=".8"
        opacity=".58"
        transform="rotate(-22 106 137)"
      />
      <path
        d="M57 107c22 12 65 17 96 9M50 154c35 18 76 18 106-1M106 79v116"
        fill="none"
        stroke="#73866b"
        strokeWidth=".8"
        opacity=".5"
      />
      <g fill="none" stroke="#b48b5f" strokeWidth="1">
        <path d="M39 66h16m-8-8v16M294 126h10m-5-5v10M137 34h12m-6-6v12" />
        <circle cx="279" cy="33" r="3" />
        <circle cx="29" cy="179" r="2.5" />
      </g>
      <path
        d="M83 57c30-24 77-15 87 14"
        stroke="#b8aa8b"
        strokeWidth="1"
        strokeDasharray="3 4"
        fill="none"
      />
      <path d="m165 64 5 7 3-8" stroke="#b8aa8b" strokeWidth="1" fill="none" />
    </svg>
  );
}
