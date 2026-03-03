export function generateCottageGreeting(streak, tomatoes, moodInfo, isWorkMode) {
    const hours = new Date().getHours();

    // 1. 최우선 순위: 첫 로그인 / 스트릭 관련 (하루 1토마토도 없을 때)
    if (tomatoes === 0) {
        if (streak > 3) return `선장님, ${streak}일 연속 항해 중! 오늘도 멋진 하루 만들어볼까요? ⛵`;
        if (streak > 0) return `반가워요! 어제에 이어 오늘도 오두막을 찾아주셨네요. 열기가 느껴집니다. 🔥`;
        return `오두막에 오신 것을 환영해요. 오늘 첫 토마토 씨앗을 심어볼까요? 🌱`;
    }

    // 2. 시간대별 특수 멘트 (토마토 1개 이상 캤을 때)
    if (hours < 6) return `이 새벽까지 깨어계시다니, 열정이 대단해요! 그래도 무리는 하지 마세요. 🌙`;
    if (hours < 10 && tomatoes > 1) return `아직 아침인데 벌써 ${tomatoes}개나 수확하셨군요! 오늘 페이스가 엄청난데요? ☀️`;

    // 3. 작업 모드 / 휴식 모드에 따른 멘트
    if (!isWorkMode) {
        // 휴식 모드일 때는 무조건 휴식/테마를 즐기라는 멘트 권장
        if (moodInfo?.name?.includes('숲')) return `수고하셨어요! 숲의 피톤치드를 마시며 깊게 심호흡해 보세요. 🌲`;
        if (moodInfo?.name?.includes('비')) return `창밖의 빗소리를 들으며 잠시 눈을 감고 쉬어가는 건 어떨까요? 🌧️`;
        if (moodInfo?.name?.includes('캠프파이어')) return `타닥타닥... 장작 타는 소리와 함께 잠시 뇌를 식혀보세요. 🔥`;
        return `잠깐의 휴식이 다음 집중을 훨씬 날카롭게 만들어 줄 거예요! ☕`;
    }

    // 4. 일반 (집중 모드 중 + 토마토 달성 상태)
    if (tomatoes >= 10) return `오늘 벌써 ${tomatoes}개째! 선장님, 혹시 지치지 않는 기계이신가요? 🤖`;
    if (tomatoes >= 5) return `${tomatoes}개의 토마토가 쌓였네요. 이 기세라면 목표 달성은 시간문제겠어요! 🎯`;

    // 5. 그 외 (기본 응원)
    return `지금 구상하시는 그 멋진 생각들, 이 오두막에서 전부 현실이 될 거예요. ✨`;
}
