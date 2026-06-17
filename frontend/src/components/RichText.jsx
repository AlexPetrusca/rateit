const RICH_REGEX = /\*\*(.+?)\*\*|_(.+?)_|~(.+?)~/g;

export const parseRichText = (text) => {
    if (!text) return null;

    const segments = [];
    let lastIndex = 0;
    let key = 0;
    const regex = new RegExp(RICH_REGEX.source, RICH_REGEX.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push(text.slice(lastIndex, match.index));
        }

        if (match[1] !== undefined) {
            segments.push(<strong key={key++}>{match[1]}</strong>);
        } else if (match[2] !== undefined) {
            segments.push(<em key={key++}>{match[2]}</em>);
        } else if (match[3] !== undefined) {
            segments.push(<u key={key++}>{match[3]}</u>);
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push(text.slice(lastIndex));
    }

    return segments.length > 0 ? segments : text;
};
