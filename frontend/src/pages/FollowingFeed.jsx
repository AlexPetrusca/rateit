import Home from './Home';
import BackendApiService from '../services/BackendApiService';

const FollowingFeed = () => <Home fetchFeed={BackendApiService.getFollowingFeed} />;

export default FollowingFeed;
