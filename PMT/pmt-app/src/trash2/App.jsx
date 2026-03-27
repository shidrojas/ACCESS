import './App.css';
import LiquidEther from './LiquidEther';
import ShinyText from './ShinyText';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
  const [activePage, setActivePage] = useState(0); // 0=Home,1=Contents,2=About,3=Updates

  return (
    <>
      <Navbar setActivePage={setActivePage} />

      {/* SLIDER WRAPPER */}
      <div
        style={{
          width: '100vw',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '400vw',
            transform: `translateX(-${activePage * 100}vw)`,
            transition: 'transform 0.7s ease'
          }}
        >
          {/* HOME */}
          <section style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <LiquidEther
              colors={['rgb(10, 10, 15)', 'rgb(40, 40, 50)', 'rgb(110, 110, 130)']}
              mouseForce={15}
              cursorSize={50}
              autoSpeed={0.06}
              autoIntensity={0.35}
              isViscous
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

          {/* CONTENTS */}
          <section className="section" style={{ width: '100vw' }}>
            
            <h1 className='content-title'>
              <span className="accent">ACCESS </span> YOUR PROJECTS AND <br />
              COLLABORATE <span className="accent"> EFFICIENTLY </span> EVERY DAY.
            </h1>
            <ProjectContent />
          </section>

          {/* ABOUT */}
          <section className="section" style={{ width: '100vw' }}>
            <h2>About</h2>
            <p>About content goes here.</p>
          </section>

          {/* UPDATES */}
          <section className="section" style={{ width: '100vw' }}>
            <h2>Updates</h2>
            <p>Provide updates.</p>
          </section>
        </div>
      </div>

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
    { title: "PROJECT DASHBOARD", img: Project, desc: "Centralized project overview with progress and metrics." },
    { title: "TEAM COLLABORATION", img: Teams, desc: "Communicate, share files, and comment seamlessly." },
    { title: "KANBAN / BOARD VIEW", img: Kanban, desc: "Visual workflow using boards and columns." },
    { title: "DEADLINES AND REMINDERS", img: Notif, desc: "Stay on track with alerts and milestones." }
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
