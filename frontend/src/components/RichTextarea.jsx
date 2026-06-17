import { useRef } from 'react';

const FORMATS = [
    { marker: '**', label: 'B', title: 'Bold', className: 'rich-toolbar-btn-bold' },
    { marker: '_', label: 'I', title: 'Italic', className: 'rich-toolbar-btn-italic' },
    { marker: '~', label: 'U', title: 'Underline', className: 'rich-toolbar-btn-underline' },
];

const RichTextarea = ({ value = '', onChange, id, placeholder, rows, disabled }) => {
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

    return (
        <div className="rich-textarea-wrapper">
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
            </div>
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
    );
};

export default RichTextarea;
