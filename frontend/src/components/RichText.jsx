const RICH_REGEX = /\[([^\]]+)\]\(([^)]+)\)|_\*\*(.+?)\*\*_|\*\*_(.+?)_\*\*|\*\*(.+?)\*\*|_(.+?)_|~(.+?)~/g;

const safeHref = (url) => /^https?:\/\//i.test(url) ? url : `https://${url}`;

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
            segments.push(<a key={key++} href={safeHref(match[2])} target="_blank" rel="noopener noreferrer" className="rich-link">{match[1]}</a>);
        } else if (match[3] !== undefined) {
            segments.push(<strong key={key++}><em>{match[3]}</em></strong>);
        } else if (match[4] !== undefined) {
            segments.push(<strong key={key++}><em>{match[4]}</em></strong>);
        } else if (match[5] !== undefined) {
            segments.push(<strong key={key++}>{match[5]}</strong>);
        } else if (match[6] !== undefined) {
            segments.push(<em key={key++}>{match[6]}</em>);
        } else if (match[7] !== undefined) {
            segments.push(<u key={key++}>{match[7]}</u>);
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push(text.slice(lastIndex));
    }

    return segments.length > 0 ? segments : text;
};
