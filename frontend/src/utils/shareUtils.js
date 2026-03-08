import { toBlob } from 'html-to-image';

/**
 * DOM 요소를 캡처하여 Blob 객체로 반환합니다. (html-to-image 사용)
 * @param {HTMLElement} element 캡처할 DOM 요소
 * @returns {Promise<Blob>} 캡처된 이미지의 Blob 객체
 */
export async function captureElementToBlob(element) {
    if (!element) throw new Error('캡처할 요소가 없습니다.');

    try {
        const blob = await toBlob(element, {
            pixelRatio: window.devicePixelRatio || 2,
            backgroundColor: null,
            filter: (node) => {
                // 특정 클래스를 가진 요소 캡처 제외
                if (node.classList && node.classList.contains('no-capture')) {
                    return false;
                }
                return true;
            }
        });

        if (!blob) throw new Error('Canvas to Blob 변환 실패 (null 반환됨)');
        return blob;
    } catch (error) {
        console.error('캡처 중 오류 발생:', error);
        throw error;
    }
}

/**
 * Blob을 파일로 다운로드합니다.
 * @param {Blob} blob 다운로드할 이미지 Blob
 * @param {string} filename 파일명
 */
export function downloadBlobAsImage(blob, filename = 'pomodoro_cottage_share.png') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Web Share API를 사용하여 이미지(File)를 공유합니다. 지원하지 않는 경우 다운로드로 대체됩니다.
 * @param {Blob} blob 공유할 이미지 Blob
 * @param {string} filename 파일명
 * @param {string} title 공유 제목
 * @param {string} text 공유 메시지
 */
export async function shareImageBlob(blob, filename = 'pomodoro_cottage_share.png', title = '나의 오두막 기록', text = '오늘 하루도 오두막에서 알차게 보냈습니다! 🍅✨') {
    const file = new File([blob], filename, { type: blob.type });

    // Web Share API 지원 여부 확인 (모바일 환경 등)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: title,
                text: text,
            });
            console.log('공유 성공');
        } catch (error) {
            // 사용자가 공유를 취소한 경우는 무시 (AbortError)
            if (error.name !== 'AbortError') {
                console.error('공유 실패:', error);
                // 실패 시 폴백으로 다운로드 시도
                downloadBlobAsImage(blob, filename);
            }
        }
    } else {
        // 지원하지 않는 브라우저(데스크톱 등)는 바로 다운로드
        console.log('Web Share API 미지원, 파일 다운로드로 대체합니다.');
        downloadBlobAsImage(blob, filename);
    }
}
