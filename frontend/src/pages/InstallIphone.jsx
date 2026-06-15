import { useNavigate } from 'react-router-dom';
import '../App.css';

const InstallIphone = () => {
    const navigate = useNavigate();

    return (
        <div className="feed-page">
            <main className="guest-shell">
                <section className="guest-card">
                    <h2>Add Critic to iPhone Home Screen</h2>
                    <p>Use Safari on your iPhone so the site can be saved like an app icon.</p>

                    <ol className="install-steps">
                        <li>Open <strong>critic-app.com</strong> in Safari.</li>
                        <li>Tap the <strong>Share</strong> button in the browser toolbar.</li>
                        <li>Scroll the share sheet and tap <strong>Add to Home Screen</strong>.</li>
                        <li>Keep the name as <strong>Critic</strong>, or change it if you want.</li>
                        <li>Tap <strong>Add</strong>.</li>
                    </ol>

                    <div className="composer-actions" style={{ justifyContent: 'flex-start' }}>
                        <button type="button" onClick={() => navigate('/')}>
                            Open Critic
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default InstallIphone;
