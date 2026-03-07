import React, { useMemo } from 'react';

export default function WeatherOverlay({ weatherData }) {
    if (!weatherData) return null;

    const wId = weatherData.weather?.[0]?.id;
    // 2xx=뇌우, 3xx=이슬비, 5xx=비, 6xx=눈
    const isRain = wId && (wId >= 200 && wId < 600);
    const isSnow = wId && (wId >= 600 && wId < 700);

    if (!isRain && !isSnow) return null;

    // 파티클 개수 증가 (풍성하게)
    const particleCount = isSnow ? 60 : 100;

    const particles = useMemo(() => {
        return Array.from({ length: particleCount }, (_, i) => {
            // 깊이감(Depth)을 주기 위해 z-index와 렌더링 스케일(크기/속도)을 3단계로 분류
            const depth = Math.random(); 
            let scale, speedMultiplier, opacity;
            
            if (depth > 0.8) {
                // 근경 (가깝고 크고 빠름)
                scale = 1.2; speedMultiplier = 0.8; opacity = 0.7 + Math.random() * 0.3;
            } else if (depth > 0.4) {
                // 중경 (보통)
                scale = 0.8; speedMultiplier = 1.2; opacity = 0.4 + Math.random() * 0.3;
            } else {
                // 원경 (작고 느리고 흐림)
                scale = 0.5; speedMultiplier = 1.8; opacity = 0.2 + Math.random() * 0.2;
            }

            return {
                id: i,
                left: `${Math.random() * 100}%`,
                scale,
                opacity,
                // 눈은 4~10초, 비는 0.4~1.2초
                duration: isSnow ? (4 + Math.random() * 6) * speedMultiplier : (0.4 + Math.random() * 0.8) * speedMultiplier,
                delay: Math.random() * 3
            };
        });
    }, [isSnow, particleCount]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
            <style>{`
                @keyframes rainDrop { 
                    0% { transform: translateY(-10vh) translateX(0) rotate(15deg); } 
                    100% { transform: translateY(110vh) translateX(-15px) rotate(15deg); } 
                }
                @keyframes snowFall { 
                    0% { transform: translateY(-5vh) translateX(0) rotate(0deg); } 
                    50% { transform: translateY(50vh) translateX(20px) rotate(180deg); } 
                    100% { transform: translateY(110vh) translateX(-20px) rotate(360deg); } 
                }
                .particle-base {
                    position: absolute;
                    top: -20px;
                    will-change: transform;
                }
                .rain-particle { 
                    width: 2px; 
                    height: 25px; 
                    background: linear-gradient(to bottom, transparent, rgba(200, 220, 255, 0.8)); 
                    filter: drop-shadow(0 0 2px rgba(255,255,255,0.4));
                    animation: rainDrop linear infinite; 
                }
                .snow-particle { 
                    width: 6px; 
                    height: 6px; 
                    background: radial-gradient(circle, rgba(255,255,255,1) 30%, rgba(255,255,255,0.2) 100%);
                    border-radius: 50%; 
                    filter: drop-shadow(0 0 4px rgba(255,255,255,0.8));
                    animation: snowFall linear infinite; 
                }
            `}</style>
            
            {particles.map(p => (
                <div
                    key={p.id}
                    className={`particle-base ${isSnow ? 'snow-particle' : 'rain-particle'}`}
                    style={{
                        left: p.left,
                        transform: `scale(${p.scale})`,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        opacity: p.opacity,
                    }}
                />
            ))}
            
            {/* 번개 효과 (뇌우 시) */}
            {wId >= 200 && wId < 300 && (
                <div className="absolute inset-0 bg-white opacity-0 animate-[flash_8s_infinite] pointer-events-none mix-blend-overlay">
                    <style>{`
                        @keyframes flash {
                            0%, 94%, 98%, 100% { opacity: 0; }
                            95% { opacity: 0.8; }
                            96% { opacity: 0.2; }
                            97% { opacity: 0.9; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
