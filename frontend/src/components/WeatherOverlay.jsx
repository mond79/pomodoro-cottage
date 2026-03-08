import React, { useEffect, useRef } from 'react';

export default function WeatherOverlay({ weatherData }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!weatherData) return;

        const wId = weatherData.weather?.[0]?.id;
        const isRain = wId && (wId >= 200 && wId < 600);
        const isSnow = wId && (wId >= 600 && wId < 700);

        if (!isRain && !isSnow) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // 화면 크기에 맞게 캔버스 해상도 조절 (크기 변경 시 대응)
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // 파티클 생성 로직
        const particleCount = isSnow ? 60 : 150;
        const particles = Array.from({ length: particleCount }, () => {
            const depth = Math.random();
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height, // 화면 전역에 고르게 시작
                depth,
                opacity: depth > 0.8 ? 0.7 + Math.random() * 0.3 : (depth > 0.4 ? 0.4 + Math.random() * 0.3 : 0.2 + Math.random() * 0.2),
                scale: depth > 0.8 ? 1.2 : (depth > 0.4 ? 0.8 : 0.5),
                // 비는 빠르고 직선적, 눈은 느리고 요동침
                speedY: isSnow ? (1 + Math.random() * 1.5) * (depth > 0.5 ? 1.5 : 0.8) : (10 + Math.random() * 15) * (depth > 0.5 ? 1.2 : 0.7),
                speedX: isSnow ? (Math.random() - 0.5) * 1.5 : (depth > 0.5 ? -2 : -1),
            };
        });

        // 애니메이션 루프
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // 이전 프레임 지우기

            particles.forEach(p => {
                // 파티클 위치 업데이트
                p.y += p.speedY;
                p.x += p.speedX;

                // 화면 밖으로 나가면 위로 재배치
                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
                if (p.x < -20) p.x = canvas.width + 20;
                if (p.x > canvas.width + 20) p.x = -20;

                // 파티클 그리기
                ctx.beginPath();
                if (isSnow) {
                    ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                    ctx.fill();
                } else {
                    // 비는 그라데이션 선으로 구현
                    const dropHeight = 25 * p.scale;
                    const grad = ctx.createLinearGradient(p.x, p.y, p.x - (p.speedX * 0.5), p.y - dropHeight);
                    grad.addColorStop(0, `rgba(200, 220, 255, ${p.opacity})`);
                    grad.addColorStop(1, 'rgba(200, 220, 255, 0)');
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.5 * p.scale;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - (p.speedX * 0.5), p.y - dropHeight);
                    ctx.stroke();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
            // 날씨가 바뀌거나 컴포넌트가 해제될 때 캔버스를 깨끗이 비워 잔상을 제거합니다.
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
    }, [weatherData]);

    const wId = weatherData?.weather?.[0]?.id;
    const isThunder = wId >= 200 && wId < 300;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            
            {/* 번개 효과 (뇌우 시에만 렌더링) */}
            {isThunder && (
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
