import './App.css';
import LiquidEther from './LiquidEther';
import ShinyText from './ShinyText';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Navbar from '../navigationbar/navbar1';
import Dashboard from '../pages/dashboard';
import Projects from '../pages/projects';
import MainLayout from '../pages/mainLayout';
import Footer from '../navigationbar/footer';
import Projectdashboard from '../pages/projectdashboard';

import Task from '../img/task.png';
import Project from '../img/dashboard.png';
import Teams from '../img/logo2.png';
import Kanban from '../img/kanban.png';
import Notif from '../img/dashboard.png';



function Home() {
  const location = useLocation();

  const smoothScrollTo = (id) => {
    const target = document.getElementById(id);
    if (!target) return;
    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + startY;
    const distance = targetY - startY;
    const duration = 600;
    let startTime = null;
    function animate(time) {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      window.scrollTo(0, startY + distance * ease);
      if (elapsed < duration) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (location.state?.scrollTo) {
      smoothScrollTo(location.state.scrollTo);
      window.history.replaceState({}, document.title);
    }

    const section = document.getElementById('contents');
    const handleScroll = () => {
      if (!section) return;
      const top = section.getBoundingClientRect().top;
      if (top <= 10) section.classList.add('no-radius');
      else section.classList.remove('no-radius');
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

  return (
    <>
      <section id="home" style={{ width: '100%', height: '100vh', position: 'relative' }}>
        <Navbar scrollTo={smoothScrollTo} />
        <LiquidEther
          colors={['rgb(10, 10, 15)', 'rgb(40, 40, 50)', 'rgb(110, 110, 130)']}
          mouseForce={15}
          cursorSize={50}
          autoSpeed={0.06}
          autoIntensity={0.35}
          isViscous={true}
          viscous={80}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
        <div className="landing-title">
          <h1>
            Achieve more with a workspace <br /> built around you with
            <span className="highlight">&nbsp;Access</span>
          </h1>
          <p>
            <ShinyText
              text="Streamline workflows, boost productivity, and watch your projects."
              disabled={false}
              speed={8}
              className="custom-class paragraph-shine"
            />
          </p>
          <MyButton />
        </div>
      </section>

      <section id="contents" className="section">
        <h1 className='content-title'>
          <span className="accent">ACCESS </span> YOUR PROJECTS AND <br />
          COLLABORATE <span className="accent"> EFFICIENTLY </span> EVERY DAY.
        </h1>

        <h1 className='content-header'></h1>
        <ProjectContent />
      </section>

      <section id="about" className="section"></section>

      <section id="updates" className="section">
        <h2>Updates</h2>
        <p>Provide updates.</p>
      </section>
      <Footer />
    </>
  );
}

function ProjectContent() {
  const [active, setActive] = useState(0);

  const categories = [
    "TASK MANAGEMENT",
    "PROJECT DASHBOARD",
    "TEAM COLLABORATION",
    "KANBAN / BOARD VIEW",
    "DEADLINES AND REMINDERS"
  ];

  const slides = [
    { title: "TASK MANAGEMENT", img: Task, desc: "Create, assign, and track tasks to ensure everything gets done on time." },
    { title: "PROJECT DASHBOARD", img: Project, desc: "Provides a centralized overview of the entire project, showing progress, completed and pending tasks, deadlines, and key metrics to help you make informed decisions." },
    { title: "TEAM COLLABORATION", img: Teams, desc: "Enables team members to communicate directly within the platform, share files and resources, leave comments on tasks, and maintain a clear record of all project discussions." },
    { title: "KANBAN / BOARD VIEW", img: Kanban, desc: "Offers a visual way to organize tasks using boards and columns like To Do, In Progress, and Done, making it easier to see workflow." },
    { title: "DEADLINES AND REMINDERS", img: Notif, desc: "Assign due dates to tasks and important milestones, and get timely alerts and notifications. This feature helps teams manage their time efficiently, avoid delays, and keep the project moving smoothly toward completion." }
  ];

  return (
    <div className="project-content-wrapper">
      <div className="project-content-tabs">
        {categories.map((cat, i) => (
          <button
            key={i}
            className={`project-content-tab ${active === i ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="project-content-slider">
        <div
          className="project-content-track"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div className="project-content-slide" key={i}>
              <div className="project-content-image-box">
                <img src={s.img} alt={s.title} />
              </div>
              <div className="project-content-info">
                <h2>{s.title}</h2>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MyButton() {
  const navigate = useNavigate();
  return (
    <div className="button-container">
      <button className="getstarted" onClick={() => navigate('/mainLayout')}>Get Started</button>
      <button className="learnmore" onClick={() => navigate('/projectdashboard')}>
        <ShinyText text="Learn More" disabled={false} speed={8} className="custom-class" />
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/mainLayout" element={<MainLayout />} />
         <Route path="/projectdashboard" element={<Projectdashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
