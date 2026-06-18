import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackendApiService from '../services/BackendApiService';

const PostRedirect = () => {
    const { ratingId: routeRatingId } = useParams();
    const { isAuthenticated } = useAuth();
    const [rateableItemId, setRateableItemId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const ratingId = useMemo(() => {
        const parsed = Number(routeRatingId);
        return Number.isFinite(parsed) ? parsed : null;
    }, [routeRatingId]);

    useEffect(() => {
        let isMounted = true;

        if (!isAuthenticated) {
            setIsLoading(false);
            return undefined;
        }

        if (ratingId == null) {
            setLoadError('Post not found.');
            setIsLoading(false);
            return undefined;
        }

        setIsLoading(true);
        setLoadError('');

        BackendApiService.getRating(ratingId)
            .then((post) => {
                if (!isMounted) {
                    return;
                }

                setRateableItemId(post?.rateableItem?.id ?? null);
            })
            .catch((error) => {
                if (!isMounted) {
                    return;
                }

                setLoadError(error.message || 'Post not found.');
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, ratingId]);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isLoading && rateableItemId != null) {
        return <Navigate to={`/topics/${rateableItemId}`} state={{ openReviewId: ratingId }} replace />;
    }

    if (!isLoading && loadError) {
        return <Navigate to="/" replace />;
    }

    return null;
};

export default PostRedirect;
