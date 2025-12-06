import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import twitchAxios from '../../api/twitchAxios';
import { verifyTwitchUserByCode } from '../../api/api';
import './RegisterCallback.css';

function RegisterCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const storedState = sessionStorage.getItem('twitch_register_oauth_state');

                // Verify CSRF state
                if (!state || !storedState || state !== storedState) {
                    setError('Invalid state parameter. Please try again.');
                    setLoading(false);
                    setTimeout(() => navigate('/register'), 3000);
                    return;
                }

                // Clear state from sessionStorage
                sessionStorage.removeItem('twitch_register_oauth_state');

                if (!code) {
                    setError('No authorization code received. Please try again.');
                    setLoading(false);
                    setTimeout(() => navigate('/register'), 3000);
                    return;
                }

                // Call verify endpoint
                const verifyResponse = await verifyTwitchUserByCode(twitchAxios, code);

                // Check if response has error structure
                if (verifyResponse.success === false) {
                    setError(verifyResponse.message || 'Verification failed. Please try again.');
                    setLoading(false);
                    setTimeout(() => navigate('/register'), 3000);
                    return;
                }

                const { following, subscribed, email, username, twitch_user_id } = verifyResponse;

                // Check if user is following or subscribed
                if (!following && !subscribed) {
                    setError('You must be following or subscribed to the channel to register. Please follow or subscribe and try again.');
                    setLoading(false);
                    setTimeout(() => navigate('/register'), 5000);
                    return;
                }

                // Store Twitch data in sessionStorage
                sessionStorage.setItem('twitch_register_data', JSON.stringify({
                    email,
                    username,
                    twitch_user_id,
                    verified: true
                }));

                // Redirect to register page
                navigate('/register');
            } catch (err: any) {
                console.error('Error in OAuth callback:', err);
                setError(err.response?.data?.message || 'An error occurred during verification. Please try again.');
                setLoading(false);
                setTimeout(() => navigate('/register'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="register-callback-container">
            <div className="register-callback-card">
                {loading ? (
                    <>
                        <h1>Verifying Twitch Account...</h1>
                        <p>Please wait while we verify your Twitch account.</p>
                    </>
                ) : (
                    <>
                        <h1>Verification {error ? 'Failed' : 'Complete'}</h1>
                        {error ? (
                            <div className="error-message">{error}</div>
                        ) : (
                            <p>Redirecting to registration...</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default RegisterCallback;

