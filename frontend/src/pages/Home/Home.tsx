import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import logo from '../../assets/savidge-apps-logo-1.0.1.png';

interface RoadmapVersion {
  version: string;
  description: string;
  isCurrent?: boolean;
  features: Array<{
    title: string;
    subItems?: string[];
  }>;
}

const roadmapVersions: RoadmapVersion[] = [
  {
    version: '1.0.0',
    description: 'Initial release with core features',
    isCurrent: true,
    features: [
      { title: 'User authentication' },
      { title: 'User profiles' },
      {
        title: 'Basic Twitch display',
        subItems: ['Followers', 'Subscribers']
      }
    ]
  },
  {
    version: '1.0.1',
    description: 'Live dashboard and alerts',
    isCurrent: false,
    features: [
      { title: 'Follower notifications' },
      { title: 'Subscriber notifications' },
      { title: 'Follower goal' },
      { title: 'Subscriber goal' },
      { title: 'Stream started' },
      { title: 'Stream ended' }
    ]
  },
  {
    version: '1.0.2',
    description: 'Basic chatbot integration',
    isCurrent: false,
    features: [
      { title: 'Greets new viewers' },
      { title: 'Directs viewers to the website' },
    ]
  }
];

function Home() {
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const currentVersion = roadmapVersions[currentVersionIndex];

  const handlePrevious = () => {
    setCurrentVersionIndex((prev) => (prev > 0 ? prev - 1 : roadmapVersions.length - 1));
  };

  const handleNext = () => {
    setCurrentVersionIndex((prev) => (prev < roadmapVersions.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="welcome-title">Welcome to Savidge Apps!</h1>
        <h2 className="subheader">
          The Official Home Page of{' '}
          <a 
            href="https://twitch.tv/savidge_af" 
            target="_blank" 
            rel="noopener noreferrer"
            className="twitch-link"
          >
            savidge_af
          </a>
        </h2>
      </header>

      <div className="logo-container">
        <img 
          src={logo} 
          alt="Savidge Apps Logo" 
          className="main-logo"
        />
      </div>

      <section className="intro-section">
        <h2 className="intro-title">Hello There!</h2>
        <p className="intro-description">
          This website is currently under construction. Checkout the roadmap below to see what's coming soon.
        </p>
        
        <div className="roadmap-container">
          <h3 className="roadmap-title">Savidge Apps Roadmap</h3>
          <div className="roadmap-navigation">
            <button 
              className="roadmap-arrow roadmap-arrow-left" 
              onClick={handlePrevious}
              aria-label="Previous version"
            >
              ←
            </button>
            <div className={`roadmap-card ${currentVersion.isCurrent ? 'current-version' : ''}`}>
              <div className="roadmap-version-header">
                <div className="roadmap-version">Version {currentVersion.version}</div>
                {currentVersion.isCurrent && (
                  <span className="current-badge">Current</span>
                )}
              </div>
              <div className="roadmap-description">{currentVersion.description}</div>
              <ul className="roadmap-features">
                {currentVersion.features.map((feature, index) => (
                  <li key={index} className="roadmap-feature">
                    {feature.title}
                    {feature.subItems && (
                      <ul className="roadmap-sub-features">
                        {feature.subItems.map((subItem, subIndex) => (
                          <li key={subIndex}>{subItem}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button 
              className="roadmap-arrow roadmap-arrow-right" 
              onClick={handleNext}
              aria-label="Next version"
            >
              →
            </button>
          </div>
          <div className="roadmap-indicators">
            {roadmapVersions.map((_, index) => (
              <button
                key={index}
                className={`roadmap-indicator ${index === currentVersionIndex ? 'active' : ''}`}
                onClick={() => setCurrentVersionIndex(index)}
                aria-label={`Go to version ${roadmapVersions[index].version}`}
              />
            ))}
          </div>
        </div>
        <p className="intro-description" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Want to learn more about me? <Link to="/about" className="about-link">Check out my About page</Link>.
        </p>
      </section>
    </div>
  );
}

export default Home;

