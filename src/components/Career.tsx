import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Full Stack Engineer & Team Lead</h4>
                <h5>Atrilect Solutions</h5>
              </div>
              <h3>2024</h3>
            </div>
            <p>
              Provided technical leadership for the Frontend team, ensuring best
              practices and code quality. Led multiple SaaS and AI-driven
              projects using React, Next.js, and SvelteKit.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Senior Frontend Developer</h4>
                <h5>Million Soft Technology (UAE)</h5>
              </div>
              <h3>2021</h3>
            </div>
            <p>
              Built and optimized large-scale web applications using Vue.js,
              React, and TypeScript. Improved page load speed and performance
              metrics by 30% through code splitting and lazy loading.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Frontend Developer</h4>
                <h5>Sourcing Square</h5>
              </div>
              <h3>2019</h3>
            </div>
            <p>
              Developed responsive UI components using HTML5, SCSS, and Vue.js.
              Collaborated with backend teams to integrate REST APIs and
              translate Figma prototypes into pixel-perfect interfaces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
