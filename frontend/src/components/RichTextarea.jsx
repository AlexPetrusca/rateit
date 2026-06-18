import { useRef } from 'react';
import LinkIcon from '@mui/icons-material/Link';

const ALL_FORMATS = [
    { marker: '**', label: 'B', title: 'Bold', className: 'rich-toolbar-btn-bold' },
    { marker: '_', label: 'I', title: 'Italic', className: 'rich-toolbar-btn-italic' },
    { marker: '~', label: 'U', title: 'Underline', className: 'rich-toolbar-btn-underline' },
];

const RichTextarea = ({ value = '', onChange, id, placeholder, rows, disabled, bold = true }) => {
    const FORMATS = bold ? ALL_FORMATS : ALL_FORMATS.filter(f => f.marker !== '**');
    const ref = useRef(null);

    const applyFormat = (marker) => {
        const el = ref.current;
        if (!el || !onChange) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.slice(start, end);
        const newValue = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;

        onChange(newValue);

        requestAnimationFrame(() => {
            el.focus();
            const cursorOffset = selected.length > 0
                ? end + marker.length
                : start + marker.length;
            el.setSelectionRange(cursorOffset, cursorOffset);
        });
    };

    const insertLink = () => {
        const el = ref.current;
        if (!el || !onChange) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.slice(start, end);
        const label = selected || 'link text';
        const newValue = `${value.slice(0, start)}[${label}]()${value.slice(end)}`;

        onChange(newValue);

        requestAnimationFrame(() => {
            el.focus();
            // place cursor inside () so the user types the URL directly
            const urlPos = start + 1 + label.length + 2;
            el.setSelectionRange(urlPos, urlPos);
        });
    };

    return (
        <div className="rich-editor">
            <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
                {FORMATS.map(({ marker, label, title, className: btnClass }) => (
                    <button
                        key={marker}
                        type="button"
                        title={title}
                        aria-label={title}
                        className={`rich-toolbar-btn ${btnClass}`}
                        disabled={disabled}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            applyFormat(marker);
                        }}
                    >
                        {label}
                    </button>
                ))}
                <button
                    type="button"
                    title="Insert link"
                    aria-label="Insert link"
                    className="rich-toolbar-btn rich-toolbar-btn-link"
                    disabled={disabled}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        insertLink();
                    }}
                >
                    <LinkIcon sx={{ fontSize: 14 }} />
                </button>
            </div>
            <div className="rich-textarea-wrapper">
                <textarea
                    ref={ref}
                    id={id}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};

export default RichTextarea;
