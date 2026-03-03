export const formatYMD = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const parseYMD = (ymd) => {
    if (!ymd) return null;
    if (ymd instanceof Date) return new Date(ymd.getFullYear(), ymd.getMonth(), ymd.getDate());
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatDDay = (ymd) => {
    if (!ymd) return '';
    const target = parseYMD(ymd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return `+${Math.abs(diff)}`;
};
