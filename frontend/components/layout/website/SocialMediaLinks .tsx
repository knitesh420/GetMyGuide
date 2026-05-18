// import React from 'react';
// import { Youtube, Instagram } from 'lucide-react';
// import { SiGoogle } from 'react-icons/si';

// const SocialMediaLinks = () => (
//     <section className="py-10 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
//         <div className="container max-w-6xl mx-auto px-4">
//             <div className="text-center mb-16">
//                 <h3 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
//                     See What Our Travelers Say
//                 </h3>
//                 <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
//                     Follow our adventures and read honest reviews from our amazing community.
//                 </p>
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
//                 {/* YouTube Link */}
//                 <a
//                     href="https://www.youtube.com/@GETMYGUIDE"
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="group"
//                 >
//                     <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
//                         <div className="flex flex-col items-center">
//                             <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
//                                 <Youtube className="w-10 h-10 text-white" />
//                             </div>
//                             <h4 className="text-xl font-bold text-gray-800 mb-2">YouTube</h4>
//                             <p className="text-sm text-gray-500 text-center">Watch our travel vlogs</p>
//                         </div>
//                     </div>
//                 </a>

//                 {/* Google Reviews Link */}
//                 <a
//                     href="https://www.google.com/search?q=getyourguide+reviews"
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="group"
//                 >
//                     <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
//                         <div className="flex flex-col items-center">
//                             <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
//                                 <SiGoogle className="w-9 h-9 text-white" />
//                             </div>
//                             <h4 className="text-xl font-bold text-gray-800 mb-2 text-center">Google Reviews</h4>
//                             <p className="text-sm text-gray-500 text-center">Read customer reviews</p>
//                         </div>
//                     </div>
//                 </a>

//                 {/* Instagram Link */}
//                 <a
//                     href="https://www.instagram.com/getmyguide.in?igsh=NzFzMTQ0MGRnZmRn&utm_source=ig_contact_invite"
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="group"
//                 >
//                     <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
//                         <div className="flex flex-col items-center">
//                             <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
//                                 <Instagram className="w-10 h-10 text-white" />
//                             </div>
//                             <h4 className="text-xl font-bold text-gray-800 mb-2">Instagram</h4>
//                             <p className="text-sm text-gray-500 text-center">Follow our journey</p>
//                         </div>
//                     </div>
//                 </a>
//             </div>
//         </div>
//     </section>
// );

// export default SocialMediaLinks;

import React, { useEffect, useRef } from "react";

const socialLinks = [
  {
    key: "youtube",
    href: "https://www.youtube.com/@GETMYGUIDE",
    label: "YouTube",
    desc: "Watch our travel vlogs",
    cta: "▶ Watch now",
    iconBg: "from-red-500 to-red-600",
    cardHover: "hover:shadow-[0_20px_48px_rgba(255,60,60,0.25)]",
    pillColor: "bg-red-50 text-red-700",
    glowColor: "rgba(255,60,60,0.5)",
    ringColor: "rgba(255,60,60,0.35)",
    bars: [
      "bg-red-500",
      "bg-red-500",
      "bg-red-500",
      "bg-red-500",
      "bg-red-500",
    ],
    floatDelay: "0s",
    cardDelay: "0.15s",
    icon: (
      <svg className="w-9 h-9 fill-white relative z-10" viewBox="0 0 24 24">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
      </svg>
    ),
  },
  {
    key: "google",
    href: "https://www.google.com/search?q=getyourguide+reviews",
    label: "Google Reviews",
    desc: "Read customer reviews",
    cta: "★ Read reviews",
    iconBg: "from-blue-500 to-green-500",
    cardHover: "hover:shadow-[0_20px_48px_rgba(66,133,244,0.25)]",
    pillColor: "bg-blue-50 text-blue-700",
    glowColor: "rgba(66,133,244,0.5)",
    ringColor: "rgba(66,133,244,0.35)",
    bars: [
      "bg-blue-500",
      "bg-red-500",
      "bg-yellow-400",
      "bg-green-500",
      "bg-blue-500",
    ],
    floatDelay: "0.5s",
    cardDelay: "0.3s",
    icon: (
      <svg className="w-8 h-8 fill-white relative z-10" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    href: "https://www.instagram.com/getmyguide.in?igsh=NzFzMTQ0MGRnZmRn&utm_source=ig_contact_invite",
    label: "Instagram",
    desc: "Follow our journey",
    cta: "♡ Follow us",
    iconBg: "from-purple-600 via-pink-500 to-orange-400",
    cardHover: "hover:shadow-[0_20px_48px_rgba(180,58,131,0.25)]",
    pillColor: "bg-purple-50 text-purple-700",
    glowColor: "rgba(180,58,131,0.5)",
    ringColor: "rgba(180,58,131,0.35)",
    bars: [
      "bg-purple-600",
      "bg-red-500",
      "bg-orange-400",
      "bg-red-500",
      "bg-purple-600",
    ],
    floatDelay: "1s",
    cardDelay: "0.45s",
    icon: (
      <svg className="w-9 h-9 fill-white relative z-10" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
];

const barHeights = [
  [10, 16, 8, 14, 10],
  [8, 14, 10, 16, 8],
  [12, 8, 16, 10, 14],
];

const SocialMediaLinks = () => {
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const colors = [
      "#a78bfa",
      "#f472b6",
      "#60a5fa",
      "#34d399",
      "#fbbf24",
      "#f87171",
    ];
    const container = dotsRef.current;
    if (!container) return;
    for (let i = 0; i < 18; i++) {
      const sz = 4 + Math.random() * 10;
      const dot = document.createElement("div");
      dot.style.cssText = `
        position:absolute; border-radius:50%; opacity:0.25;
        width:${sz}px; height:${sz}px;
        background:${colors[i % colors.length]};
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation: gmg-drift ${4 + Math.random() * 5}s ease-in ${Math.random() * 6}s infinite;
        pointer-events:none;
      `;
      container.appendChild(dot);
    }
  }, []);

  return (
    <>
      <style>{`
        @keyframes gmg-bg-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes gmg-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes gmg-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes gmg-pulse-ring { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(1.6);opacity:0} }
        @keyframes gmg-sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
        @keyframes gmg-card-in { 0%{opacity:0;transform:translateY(32px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes gmg-title-in { 0%{opacity:0;transform:translateY(-16px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes gmg-wave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.5)} }
        @keyframes gmg-drift { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(-60px) rotate(180deg);opacity:0} }
        .gmg-section {
          animation: gmg-bg-shift 8s ease infinite;
          background-size: 300% 300%;
        }
        .gmg-heading-shine {
          background: linear-gradient(90deg,#6c3fff,#c93cff,#ff3c9d,#ff7c3c,#c93cff,#6c3fff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gmg-shimmer 3s linear infinite, gmg-title-in 0.7s ease both;
        }
        .gmg-sub { animation: gmg-title-in 0.8s ease 0.1s both; }
        .gmg-icon-float { animation: gmg-float 3s ease-in-out infinite; }
        .gmg-wave-bar { animation: none; display:inline-block; border-radius:2px; margin:0 1.5px; }
        .gmg-card:hover .gmg-wave-bar { animation: gmg-wave 0.6s ease infinite; }
        .gmg-wave-bar:nth-child(1){animation-delay:0s}
        .gmg-wave-bar:nth-child(2){animation-delay:0.1s}
        .gmg-wave-bar:nth-child(3){animation-delay:0.2s}
        .gmg-wave-bar:nth-child(4){animation-delay:0.3s}
        .gmg-wave-bar:nth-child(5){animation-delay:0.4s}
        .gmg-pulse-ring { animation: none; }
        .gmg-card:hover .gmg-pulse-ring { animation: gmg-pulse-ring 1.2s ease-out infinite; }
        .gmg-sparkle { animation: none; }
        .gmg-card:hover .gmg-sparkle { animation: gmg-sparkle 1s ease infinite; }
        .gmg-cta-pill {
          opacity: 0; transform: translateY(6px);
          transition: opacity 0.25s, transform 0.25s;
        }
        .gmg-card:hover .gmg-cta-pill { opacity: 1; transform: translateY(0); }
      `}</style>

      <section
        className="gmg-section relative py-14 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg,#f0f4ff 0%,#faf0ff 40%,#fff0f8 70%,#fff5e8 100%)",
        }}
      >
        {/* Floating radial glows */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle,#a78bfa,transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle,#f472b6,transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        {/* Floating dots */}
        <div
          ref={dotsRef}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />

        <div className="relative max-w-3xl mx-auto px-6">
          {/* Heading */}
          <div className="text-center mb-12">
            <h2
              className="gmg-heading-shine text-4xl md:text-5xl font-bold mb-3"
              style={{ lineHeight: 1.2 }}
            >
              See What Our Travelers Say
            </h2>
            <p className="gmg-sub text-gray-500 text-lg max-w-md mx-auto">
              Follow our adventures and read honest reviews from our amazing
              community.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {socialLinks.map((s, idx) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`gmg-card group relative block rounded-2xl p-8 text-center cursor-pointer
                  bg-white/85 backdrop-blur-sm border border-white/90
                  transition-transform duration-300 ease-out hover:-translate-y-2.5 hover:scale-[1.03]
                  ${s.cardHover}`}
                style={{
                  animation: `gmg-card-in 0.6s ease ${s.cardDelay} both`,
                  textDecoration: "none",
                }}
              >
                {/* Sparkles */}
                {[
                  {
                    pos: "top-[14%] left-[11%]",
                    color: "#ffcc00",
                    delay: "0s",
                  },
                  {
                    pos: "top-[10%] right-[13%]",
                    color: "#ff6bff",
                    delay: "0.3s",
                  },
                  {
                    pos: "bottom-[16%] left-[9%]",
                    color: "#33ccff",
                    delay: "0.6s",
                  },
                  {
                    pos: "bottom-[11%] right-[11%]",
                    color: "#6bffaa",
                    delay: "0.9s",
                  },
                ].map((sp, i) => (
                  <span
                    key={i}
                    className={`gmg-sparkle absolute w-1.5 h-1.5 rounded-full pointer-events-none ${sp.pos}`}
                    style={{ background: sp.color, animationDelay: sp.delay }}
                  />
                ))}

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {/* Pulse ring */}
                    <div
                      className="gmg-pulse-ring absolute inset-[-6px] rounded-[22px]"
                      style={{ border: `2px solid ${s.glowColor}` }}
                    />
                    <div
                      className={`gmg-icon-float w-18 h-18 w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br ${s.iconBg} flex items-center justify-center shadow-lg`}
                      style={{ animationDelay: s.floatDelay }}
                    >
                      {s.icon}
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="text-gray-800 font-bold text-base mb-1">
                  {s.label}
                </div>
                <div className="text-gray-400 text-xs mb-3">{s.desc}</div>

                {/* Wave bars */}
                <div className="flex items-center justify-center h-5 mb-3">
                  {barHeights[idx].map((h, i) => (
                    <div
                      key={i}
                      className={`gmg-wave-bar ${s.bars[i]} w-[3px]`}
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                {/* CTA pill */}
                <span
                  className={`gmg-cta-pill inline-block text-[11px] font-semibold px-3 py-1 rounded-full ${s.pillColor}`}
                >
                  {s.cta}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default SocialMediaLinks;
