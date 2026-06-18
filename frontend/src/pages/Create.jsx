import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CameraIconHD from '../assets/icons/hand_drawn/camera.svg?react';
import UploadIconHD from '../assets/icons/hand_drawn/upload.svg?react';
import XIconHD from '../assets/icons/hand_drawn/x.svg?react';
import BackIconHD from '../assets/icons/hand_drawn/back.svg?react';
import CheckMarkHD from '../assets/icons/hand_drawn/check_mark.svg?react';
import DraftIconHD from '../assets/icons/hand_drawn/draft.svg?react';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import { parseRichText } from '../components/RichText.jsx';
import RichTextarea from '../components/RichTextarea.jsx';
import StarRating from '../components/StarRating.jsx';
import { useIconPack } from '../contexts/IconPackContext.jsx';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import {
    buildCreateRatingRequest,
    validateCreateRatingDraft
} from '../utils/createRating.js';
import { formatFiveStarScore } from '../utils/ratingDisplay.js';
import '../App.css';

const Create = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { iconPack } = useIconPack();
    const hd = iconPack === 'hand_drawn';
    const incomingDraft = location.state?.draft;
    const backSteps = location.state?.backSteps ?? 1;
    const [draftId, setDraftId] = useState(incomingDraft?.id ?? null);
    const [body, setBody] = useState(incomingDraft?.body ?? '');
    const [reviewText, setReviewText] = useState(incomingDraft?.reviewText ?? '');
    const [score, setScore] = useState(incomingDraft?.score ? String(incomingDraft.score) : '4');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredScore, setHoveredScore] = useState(null);
    const { notify } = useNotifications();

    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return undefined;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedFile]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files?.[0] || null);
    };

    const uploadMedia = async () => {
        if (!selectedFile) return { mediaObjectKey: null, mediaContentType: null };
        const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedFile.name, selectedFile.type);
        await BackendApiService.uploadFileToS3(uploadUrl, selectedFile);
        return { mediaObjectKey: key, mediaContentType: selectedFile.type };
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            if (draftId) {
                await BackendApiService.publishDraft(draftId);
            } else {
                const validationError = validateCreateRatingDraft({ body, selectedFile, score });
                if (validationError) {
                    notify({ message: validationError, type: 'warning' });
                    return;
                }
                const { mediaObjectKey, mediaContentType } = await uploadMedia();
                await BackendApiService.createRating(
                    buildCreateRatingRequest({ body, reviewText, score, mediaObjectKey, mediaContentType })
                );
            }
            navigate('/');
        } catch (err) {
            notify({ message: err.message || 'Failed to post rating', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!body.trim() && !selectedFile && !reviewText.trim()) return;
        try {
            const { mediaObjectKey, mediaContentType } = await uploadMedia();
            const saved = await BackendApiService.saveDraft({
                id: draftId,
                body,
                reviewText,
                score: score ? Number(score) : null,
                mediaObjectKey,
                mediaContentType
            });
            setDraftId(saved.id);
            notify({ message: 'Draft saved', type: 'success' });
            navigate(-backSteps);
        } catch (err) {
            notify({ message: err.message || 'Failed to save draft', type: 'error' });
        }
    };

    const currentScore = Number(score);
    const previewScore = hoveredScore ?? currentScore;
    const scoreLabel = formatFiveStarScore(previewScore);

    return (
        <div className="feed-page">
            <main className="twitter-shell create-shell">
                <section className="create-form">
                    <div className="create-layout">
                        <div className="create-fields">
                            <div className="form-group">
                                <div className="create-photo-label-row">
                                    <label>Photo</label>
                                    <button className="create-drafts-btn" onClick={() => navigate('/drafts', { state: { backSteps: backSteps + 1 } })}>Drafts</button>
                                </div>
                                <div className="file-input-buttons">
                                    <input id="create-image" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                    <input id="create-image-camera" type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
                                    <button type="button" className="file-input-btn file-input-btn--lg" aria-label="Take photo" onClick={() => document.getElementById('create-image-camera').click()}>
                                        {hd ? <CameraIconHD /> : <PhotoCameraOutlinedIcon />}
                                    </button>
                                    <button type="button" className="file-input-btn file-input-btn--lg" aria-label="Upload photo" onClick={() => document.getElementById('create-image').click()}>
                                        {hd ? <UploadIconHD /> : <FileUploadOutlinedIcon />}
                                    </button>
                                    {selectedFile && (
                                        <button type="button" className="file-input-btn file-input-btn--lg" aria-label="Remove photo" onClick={() => setSelectedFile(null)}>
                                            {hd ? <XIconHD /> : <CloseIcon />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="create-body">{selectedFile ? 'Title' : 'Topic'}</label>
                                <RichTextarea
                                    id="create-body"
                                    value={body}
                                    onChange={setBody}
                                    placeholder="Write the thing you want to rate, or add a caption for your photo"
                                    rows={5}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="create-review">Your review</label>
                                <RichTextarea
                                    id="create-review"
                                    value={reviewText}
                                    onChange={setReviewText}
                                    placeholder="Add your rating context"
                                    rows={4}
                                />
                            </div>

                            <div className="form-group score-group">
                                <label id="create-score-label">Rating</label>
                                <div className="score-row">
                                    <output className="score-value">{scoreLabel}</output>
                                    <StarRating
                                        value={previewScore}
                                        label={`Selected rating: ${scoreLabel}`}
                                        size="lg"
                                        interactive
                                        onChange={(nextScore) => setScore(nextScore.toString())}
                                        onHoverChange={setHoveredScore}
                                    />
                                </div>
                            </div>

                            <p className="create-preview-label">How it will look:</p>
                        </div>

                        <aside className="create-preview">
                            <div className="create-preview-frame">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Selected upload preview" />
                                ) : (
                                    <div className="create-preview-placeholder">
                                        Your photo preview will appear here
                                    </div>
                                )}
                            </div>
                            <div className="create-preview-meta">
                                <p>{body.trim() ? parseRichText(body.trim()) : 'Add text to describe the thing you are rating.'}</p>
                                {reviewText.trim() && (
                                    <>
                                        <hr className="create-preview-divider" />
                                        <p>{parseRichText(reviewText.trim())}</p>
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                    <div className="composer-actions">
                        <button type="button" className="composer-icon-btn" onClick={() => navigate(-backSteps)} aria-label="Back">
                            {hd ? <BackIconHD /> : <ArrowBackIcon />}
                        </button>
                        <button type="button" className="composer-icon-btn" onClick={handleSaveDraft} disabled={isLoading} aria-label="Save draft">
                            {hd ? <DraftIconHD /> : <BookmarkBorderOutlinedIcon />}
                        </button>
                        <button type="button" className="composer-icon-btn" onClick={handleSubmit} disabled={isLoading} aria-label="Submit">
                            {hd ? <CheckMarkHD /> : <CheckIcon />}
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Create;
