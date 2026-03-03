/**
 * Web Audio API를 사용하여 외부 파일 없이 알림음을 생성하는 유틸리티
 */
export function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // 두 개의 음을 연달아 재생 (띵-동 느낌)
        playTone(audioCtx, 523.25, 0);   // C5
        playTone(audioCtx, 659.25, 0.2); // E5
        playTone(audioCtx, 783.99, 0.4); // G5 (풍성한 마감음)

    } catch (e) {
        console.error('알림음 재생 실패:', e);
    }
}

function playTone(ctx, freq, startTime) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine'; // 부드러운 사인파
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    // 볼륨 엔벨로프 (부드러운 시작과 끝)
    gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime + startTime);
    oscillator.stop(ctx.currentTime + startTime + 0.6);
}
