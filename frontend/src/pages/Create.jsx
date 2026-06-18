import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import CameraIconHD from '../assets/icons/hand_drawn/camera.svg?react';
import UploadIconHD from '../assets/icons/hand_drawn/upload.svg?react';
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
    const { iconPack } = useIconPack();
    const hd = iconPack === 'hand_drawn';
    const [body, setBody] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [score, setScore] = useState('4');
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

    const handleSubmit = async () => {
        const validationError = validateCreateRatingDraft({ body, selectedFile, score });

        if (validationError) {
            notify({ message: validationError, type: 'warning' });
            return;
        }

        setIsLoading(true);

        try {
            let mediaObjectKey = null;
            let mediaContentType = null;

            if (selectedFile) {
                const { uploadUrl, key } = await BackendApiService.getUploadUrl(selectedFile.name, selectedFile.type);
                await BackendApiService.uploadFileToS3(uploadUrl, selectedFile);
                mediaObjectKey = key;
                mediaContentType = selectedFile.type;
            }

            await BackendApiService.createRating({
                ...buildCreateRatingRequest({
                    body,
                    reviewText,
                    score,
                    mediaObjectKey,
                    mediaContentType
                }),
                mediaObjectKey,
                mediaContentType
            });

            navigate('/');
        } catch (err) {
            const message = err.message || 'Failed to post rating';
            notify({ message, type: 'error' });
        } finally {
            setIsLoading(false);
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
                                <label>Photo</label>
                                <div className="file-input-buttons">
                                    <input id="create-image" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                    <input id="create-image-camera" type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
                                    <button type="button" className="file-input-btn" aria-label="Take photo" onClick={() => document.getElementById('create-image-camera').click()}>
                                        {hd ? <CameraIconHD /> : <PhotoCameraOutlinedIcon />}
                                    </button>
                                    <button type="button" className="file-input-btn" aria-label="Upload photo" onClick={() => document.getElementById('create-image').click()}>
                                        {hd ? <UploadIconHD /> : <FileUploadOutlinedIcon />}
                                    </button>
                                    {selectedFile && (
                                        <button type="button" className="link-button" onClick={() => setSelectedFile(null)}>
                                            Remove
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

                            <div className="composer-actions create-actions">
                                <button type="button" onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? 'Posting...' : 'Post rating'}
                                </button>
                            </div>
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
                            </div>
                        </aside>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Create;
