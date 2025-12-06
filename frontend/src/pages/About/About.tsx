import './About.css';
import danImage from '../../assets/savidge-dan.png';

function About() {
  return (
    <div className="about-container">
      <header className="about-header">
        <h1 className="about-title">ABOUT ME</h1>
      </header>

      <div className="about-image-container">
        <img 
          src={danImage} 
          alt="Dan Savidge" 
          className="about-image"
        />
      </div>

      <section className="about-content">
        <div className="about-intro">
          <h2 className="about-intro-title">Hi I'm Dan Savidge</h2>
          <p className="about-intro-text">
            I'm a software engineer with a passion for programming, math, teaching and sports. 
            I have a M.S. in Computer Science and a B.S. in both Computer Science and Mathematics from RPI (Rensselaer Polytechnic Institute).
            Being a member of the swim team at RPI, was one of the best experiences of my life and it's why I still work as a part-time swim coach.
            I love to learn new things and I hope to inspire others to do the same.
          </p>
        </div>

        <div className="about-section">
          <h2 className="about-section-title">Why I Made This Site</h2>
          <div className="about-section-content">
            <p>
              Back when I was in college, I thought I could make some money as a Valorant streamer, but man was I wrong. I quickly realized how bad I was at it.
              I knew I wanted to try streaming, but had to find something else. I've always had fun tutoring my friends and teammates, so I figured I could make a website to help people learn.
              Still with dreams of becoming a streamer, this website was designed to connect with my twitch channel and give me another platform to share my knowledge.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;

