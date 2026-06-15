import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { backlogData } from '../generated/backlogData.js';
import '../App.css';

const renderInlineText = (text) => {
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
        }

        return <span key={`${part}-${index}`}>{part}</span>;
    });
};

const Backlog = () => {
    const navigate = useNavigate();
    const priorityOrder = useMemo(() => ['P1', 'P2', 'P3', 'P4', 'P5'], []);
    const sectionsByPriority = useMemo(() => {
        return new Map((backlogData?.sections || []).map((section) => [section.priority, section]));
    }, []);

    return (
        <div className="feed-page">
            <main className="twitter-shell backlog-shell">
                <div className="timeline-header backlog-header">
                    <div>
                        <h1>Backlog</h1>
                        <p>Rendered from the To Do section of build-status.</p>
                    </div>
                    <button type="button" className="nav-pill-button" onClick={() => navigate('/')}>
                        Home
                    </button>
                </div>

                <section className="backlog-body" aria-label="Project backlog">
                    {priorityOrder.map((priority) => {
                        const section = sectionsByPriority.get(priority);
                        const items = section?.items || [];

                        return (
                            <div key={priority} className="backlog-section">
                                <h2>{priority}</h2>
                                {items.length === 0 ? (
                                    <p className="backlog-empty">No items yet.</p>
                                ) : (
                                    <ul>
                                        {items.map((item) => (
                                            <li key={item}>{renderInlineText(item)}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </section>
            </main>
        </div>
    );
};

export default Backlog;
