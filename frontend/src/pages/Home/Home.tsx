import './Home.css';
import logo from '../../assets/savidge-apps-logo-1.0.1.png';

function Home() {
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
          This website began as a simple way to engage more deeply with my viewers. 
          I originally intended it to where I displayed the graphics for my livestreams. 
          As I started building a dashboard, I realized it had the potential to be much more. 
          I've always dreamed of being a teacher, and this site is an extension of that. 
          While it's still early in development, my goal for this platform is to offer everyone 
          a glimpse into the world of programming. Whether it's apps, games, or scripts, 
          we can build whatever we imagine - together.
        </p>
      </section>
    </div>
  );
}

export default Home;

