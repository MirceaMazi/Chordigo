/** A small, quiet corner of the room, drawn in the same ink as the interface. */
export function PracticeNook() {
  return (
    <div className="practice-nook" aria-hidden="true">
      <svg viewBox="0 0 320 224" fill="none">
        <path
          d="M38 189c12-47 9-99 29-129 26-37 91-36 128-21 47 18 75 82 70 150Z"
          fill="#eee0c3"
          opacity=".75"
        />
        <path
          d="M64 51c1-8 4-12 13-12h85c8 0 11 5 11 13l-1 92H64Z"
          fill="#fff8e5"
          stroke="#baa382"
          strokeWidth="2"
        />
        <path d="M70 47h96v88H70Z" fill="#e8eddd" />
        <path d="M72 108c17-10 28-10 44 2 20-20 30-14 48-19v43H72Z" fill="#c8d1ad" />
        <circle cx="143" cy="70" r="12" fill="#e3bc74" />
        <path d="M118 43v93M69 88h98" stroke="#bda88b" strokeWidth="3" />
        <path d="M58 140h119l4 7H55Z" fill="#ccb393" stroke="#a58a67" strokeWidth="1.5" />
        <path
          d="M58 45c-8 9-10 50-10 83l14 2c-1-27 0-62 9-84M166 46c11 22 11 47 9 84l14-1c-1-36-4-70-14-84"
          fill="#d4a586"
        />
        <path
          d="m53 57 4 2m-7 32 8 3m-6 30 7 3m114-70 6-1m-2 34 8-1m-7 31 9-1"
          stroke="#b88a6b"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path d="M191 190h83M232 185V97" stroke="#896d4b" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M209 96c5-13 6-25 9-34h29l10 34Z"
          fill="#e5c68c"
          stroke="#aa8755"
          strokeWidth="1.8"
        />
        <path d="M218 62c8 3 19 3 29 0" stroke="#ad8a5b" strokeWidth="1.3" />
        <path d="m225 75-3 18m18-18 3 18" stroke="#f6e2b5" strokeWidth="2" />
        <path d="M231 98v7" stroke="#b69a6e" strokeWidth="2" />
        <path
          d="M67 176c-3-18-2-28 6-31 9-4 20-3 27 2l2 30"
          fill="#b4815a"
          stroke="#906543"
          strokeWidth="2"
        />
        <path d="m69 177-5 22m34-22 6 22" stroke="#826343" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M61 174c9-3 34-4 45 0l-1 7H62Z"
          fill="#c7976b"
          stroke="#916d48"
          strokeWidth="1.8"
        />
        <ellipse cx="123" cy="201" rx="26" ry="3" fill="#b49b79" opacity=".2" />
        {/* Keep the neck, sound hole and bridge on one axis before leaning the guitar. */}
        <g transform="translate(122 200) rotate(17)">
          <path
            d="M-6-77C-14-82-26-72-25-61c0 9 10 12 9 20-1 7-13 9-13 21C-29-6-15 1 0 1S29-6 29-20c0-12-12-14-13-21-1-8 9-11 9-20 1-11-11-21-19-16Z"
            fill="#d5a166"
            stroke="#8a603d"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M-23-23c-1 11 8 17 18 18"
            stroke="#e7bc85"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M-5-124H5l2 50H-7Z" fill="#ad7a4f" stroke="#795539" strokeWidth="1.5" />
          <path
            d="M-7-124-9-144q0-2 2-2H7q2 0 2 2l-2 20Z"
            fill="#ad7a4f"
            stroke="#795539"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {[-140, -134, -128].map((y) => (
            <g key={y}>
              <path d={`M-8 ${y}h-4m20 0h4`} stroke="#79634d" strokeWidth="1.4" />
              <ellipse
                cx="-12"
                cy={y}
                rx="1.6"
                ry="2"
                fill="#bca27c"
                stroke="#79634d"
                strokeWidth=".8"
              />
              <ellipse
                cx="12"
                cy={y}
                rx="1.6"
                ry="2"
                fill="#bca27c"
                stroke="#79634d"
                strokeWidth=".8"
              />
              <circle cx="-4" cy={y} r="1" fill="#e3d1ad" />
              <circle cx="4" cy={y} r="1" fill="#e3d1ad" />
            </g>
          ))}
          <path d="M-4.7-124h9.4L6.3-59H-6.3Z" fill="#795539" />
          {Array.from({ length: 16 }, (_, index) => {
            const y = -124 + 103 * (1 - 2 ** (-(index + 1) / 12));
            const halfWidth = 4.7 + ((y + 124) / 65) * 1.6;
            return (
              <path
                key={index}
                d={`M${-halfWidth} ${y}H${halfWidth}`}
                stroke="#c4aa83"
                strokeWidth=".6"
              />
            );
          })}
          <circle cy="-45" r="10" fill="#e5bc85" stroke="#a77a4a" strokeWidth="1" />
          <circle cy="-45" r="7.4" fill="#684b35" />
          <path d="M-12-24q-2 0-2 2v4q0 2 2 2h24q2 0 2-2v-4q0-2-2-2Z" fill="#795335" />
          <path d="M-5-124H5m-10 102H5" stroke="#f1dfbd" strokeWidth="1.5" />
          {Array.from({ length: 6 }, (_, index) => {
            const nutX = -3.25 + index * 1.3;
            const bridgeX = -4 + index * 1.6;
            const postX = index < 3 ? -4 : 4;
            const postY = [-128, -134, -140, -140, -134, -128][index];
            return (
              <g key={index}>
                <path
                  d={`M${postX} ${postY} ${nutX} -124 ${bridgeX} -19`}
                  stroke="#eddbc0"
                  strokeWidth={index < 3 ? ".5" : ".35"}
                />
                <circle cx={bridgeX} cy="-18.5" r=".65" fill="#e5c897" />
              </g>
            );
          })}
        </g>
        <path
          d="M251 183c-5-19-1-35 6-44m-2 23c-17-1-22-13-17-20 10 3 17 12 17 20Zm2-15c-2-11 3-22 10-22 2 10-2 17-10 22Zm-1 25c2-15 14-19 21-15-2 11-10 16-21 15Z"
          fill="#829168"
          stroke="#6b7c57"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M242 179h28l-4 21h-20Z" fill="#bb8161" stroke="#946347" strokeWidth="1.8" />
        <path d="M240 179h32v5h-32Z" fill="#cc9370" stroke="#946347" strokeWidth="1.5" />
        <ellipse cx="182" cy="203" rx="37" ry="5" fill="#d1bda0" opacity=".5" />
        <path
          d="M171 196h25v5h-25Zm-3-6h27v6h-27Z"
          fill="#acb58b"
          stroke="#79815d"
          strokeWidth="1.3"
        />
        <path d="M174 190h18v-5h-18Z" fill="#d9b077" stroke="#a68050" strokeWidth="1.3" />
        <path
          d="M202 184h14v11c-1 6-12 6-13 0Z"
          fill="#f5ead6"
          stroke="#a68b68"
          strokeWidth="1.5"
        />
        <path
          d="M216 186c9-2 8 9 0 8m-8-14c-5-5 4-7 0-12"
          stroke="#a68b68"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M40 202c38-2 74 1 109 0m65 1 69-1"
          stroke="#b49b79"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>There’s always room for a little music.</span>
    </div>
  );
}
