import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import BackIconHD from '../assets/icons/hand_drawn/back.svg?react';
import XIconHD from '../assets/icons/hand_drawn/x.svg?react';
import { useIconPack } from '../contexts/IconPackContext.jsx';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import '../App.css';

const Drafts = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { iconPack } = useIconPack();
    const { notify } = useNotifications();
    const hd = iconPack === 'hand_drawn';
    const backSteps = location.state?.backSteps ?? 1;
    const [drafts, setDrafts] = useState([]);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        BackendApiService.getDrafts()
            .then(setDrafts)
            .catch(() => notify({ message: 'Failed to load drafts', type: 'error' }));
    }, []);

    const handleLoad = (draft) => {
        navigate('/create', { state: { draft, backSteps: backSteps + 1 } });
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (deletingId === id) return;
        setDeletingId(id);
        try {
            await BackendApiService.deleteDraft(id);
            setDrafts(ds => ds.filter(d => d.id !== id));
        } catch {
            notify({ message: 'Failed to delete draft', type: 'error' });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="feed-page">
            <main className="twitter-shell">
                <div className="drafts-header">
                    <button className="composer-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
                        {hd ? <BackIconHD /> : <ArrowBackIcon />}
                    </button>
                    <h2>Drafts</h2>
                </div>
                {drafts.length === 0 ? (
                    <p className="drafts-empty">No saved drafts.</p>
                ) : (
                    <ul className="drafts-list">
                        {drafts.map(d => (
                            <li key={d.id} className="draft-item" onClick={() => handleLoad(d)}>
                                <div className="draft-item-body">
                                    <span className="draft-item-title">{d.body || '(no title)'}</span>
                                    <span className="draft-item-date">{new Date(d.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <button className="draft-item-delete composer-icon-btn" onClick={(e) => handleDelete(e, d.id)} disabled={deletingId === d.id} aria-label="Delete draft">
                                    {hd ? <XIconHD /> : <CloseIcon />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default Drafts;
