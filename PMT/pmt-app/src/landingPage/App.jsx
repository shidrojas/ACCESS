// App.jsx
import './App.css';
import LiquidEther from './LiquidEther';
import ShinyText from './ShinyText';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Login from '../pages/Login';
import Register from '../pages/Register';
import Navbar from '../navigationbar/navbar1';
import Dashboard from '../pages/dashboard';
import Projects from '../pages/projects';
import MainLayout from '../pages/mainLayout';
import AdminMainLayout from '../AdminForm/AdminMainLayout';
import TeacherMainLayout from '../TeacherForms/TeacherMainLayout';
import Footer from '../navigationbar/footer';

import Task from '../img/task.png';
import Project from '../img/dashboard.png';
import Teams from '../img/logo2.png';
import Kanban from '../img/kanban.png';
import Notif from '../img/dashboard.png';

// About Us Component
function About() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8faff 0%, #f0f4fa 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Elements */}
      {!isMobile && (
        <>
          <div style={{
            position: 'absolute',
            top: '5%',
            right: '0',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(75,143,135,0.05) 0%, rgba(75,143,135,0) 70%)',
            zIndex: 0
          }} />
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(75,143,135,0.03) 0%, rgba(75,143,135,0) 70%)',
            zIndex: 0
          }} />
        </>
      )}

      {/* Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '80px 20px 40px' : '120px 48px 80px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '40px' : '60px' }}>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            fontWeight: '700',
            color: '#4b8f87',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '15px'
          }}>
            ABOUT US
          </span>
          <h1 style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: isMobile ? 'clamp(2rem, 8vw, 2.5rem)' : 'clamp(2.5rem, 6vw, 4.5rem)',
            color: '#1a2634',
            letterSpacing: '0.04em',
            lineHeight: '1.1',
            marginBottom: '20px',
            padding: isMobile ? '0 10px' : '0'
          }}>
            Empowering Teams to <span style={{ color: '#4b8f87' }}>Achieve More</span>
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            color: '#5a6a7a',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.8',
            padding: isMobile ? '0 15px' : '0'
          }}>
            We're on a mission to transform how teams collaborate and manage projects,
            making workflow management intuitive, efficient, and even enjoyable.
          </p>
        </div>

        {/* Mission & Vision Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: isMobile ? '20px' : '30px',
          marginBottom: isMobile ? '40px' : '80px'
        }}>
          {[
            {
              title: 'Our Mission',
              content: 'To provide a seamless project management experience that empowers teams to collaborate effectively, meet deadlines, and deliver exceptional results.',
              icon: '🎯'
            },
            {
              title: 'Our Vision',
              content: 'To become the go-to platform for teams worldwide, setting new standards in project management through innovation and user-centric design.',
              icon: '👁️'
            },
            {
              title: 'Our Values',
              content: 'Innovation, collaboration, transparency, and continuous improvement drive everything we do at Access.',
              icon: '💡'
            }
          ].map((item, index) => (
            <div key={index} style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(75,143,135,0.15)',
              borderRadius: '24px',
              padding: isMobile ? '30px 20px' : '40px 30px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.02)',
              transition: 'transform 0.3s ease',
              cursor: 'default',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => !isMobile && (e.currentTarget.style.transform = 'translateY(-10px)')}
            onMouseLeave={(e) => !isMobile && (e.currentTarget.style.transform = 'translateY(0)')}>
              <div style={{
                fontSize: isMobile ? '2.5rem' : '3rem',
                marginBottom: '20px'
              }}>{item.icon}</div>
              <h3 style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: isMobile ? '1.8rem' : '2rem',
                color: '#1a2634',
                marginBottom: '15px',
                letterSpacing: '0.02em'
              }}>{item.title}</h3>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: isMobile ? '0.9rem' : '1rem',
                color: '#5a6a7a',
                lineHeight: '1.7'
              }}>{item.content}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? '20px' : '40px',
          marginBottom: isMobile ? '40px' : '80px',
          padding: isMobile ? '30px 20px' : '40px',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(10px)',
          borderRadius: isMobile ? '30px' : '50px',
          border: '1px solid rgba(75,143,135,0.1)'
        }}>
          {[
            { number: '5,000+', label: 'Active Teams' },
            { number: '50,000+', label: 'Projects Completed' },
            { number: '98%', label: 'Client Satisfaction' },
            { number: '24/7', label: 'Customer Support' }
          ].map((stat, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <strong style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: isMobile ? '1.8rem' : '2.5rem',
                color: '#4b8f87',
                display: 'block',
                lineHeight: '1.2'
              }}>{stat.number}</strong>
              <span style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: '600',
                color: '#5a6a7a',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Team Section */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: isMobile ? 'clamp(1.8rem, 6vw, 2rem)' : 'clamp(2rem, 4vw, 3rem)',
            color: '#1a2634',
            marginBottom: '20px'
          }}>
            Meet Our <span style={{ color: '#4b8f87' }}>Development Team</span>
          </h2>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: isMobile ? '0.9rem' : '1rem',
            color: '#5a6a7a',
            maxWidth: '600px',
            margin: '0 auto 40px',
            padding: isMobile ? '0 20px' : '0'
          }}>
            The talented individuals behind Access, working together to create the best project management experience
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '20px' : '30px'
          }}>
            {/* Team Members */}
            {[
              {
                name: 'Alrashid C. Rojas',
                role: 'Back-End Developer & Project Manager',
                icon: 'fas fa-database',
                description: 'Leading the development team and architecting robust back-end solutions'
              },
              {
                name: 'Asher Cleric Angel L. Laxa',
                role: 'Front-End Developer & UI/UX Designer',
                icon: 'fas fa-paint-brush',
                description: 'Crafting beautiful and intuitive user interfaces with a focus on user experience design'
              },
              {
                name: 'Nichole E. Balgemino',
                role: 'Documentation & Quality Assurance',
                icon: 'fas fa-check-circle',
                description: 'Ensuring top-quality standards and comprehensive documentation'
              }
            ].map((member, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(75,143,135,0.15)',
                borderRadius: '20px',
                padding: isMobile ? '25px 15px' : '30px 20px',
                transition: !isMobile ? 'all 0.3s ease' : 'none',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(75,143,135,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #4b8f87, #65bdb4)'
                }} />
                <div style={{
                  fontSize: isMobile ? '2.5rem' : '3.5rem',
                  marginBottom: '15px',
                  color: '#4b8f87'
                }}>
                  <i className={member.icon}></i>
                </div>
                <h4 style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: isMobile ? '1.5rem' : '1.8rem',
                  color: '#1a2634',
                  marginBottom: '5px'
                }}>{member.name}</h4>
                <div style={{
                  background: 'rgba(75,143,135,0.1)',
                  borderRadius: '100px',
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  display: 'inline-block',
                  marginBottom: '10px'
                }}>
                  <p style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: isMobile ? '0.8rem' : '0.95rem',
                    fontWeight: '700',
                    color: '#4b8f87',
                    letterSpacing: '0.05em',
                    margin: 0
                  }}>{member.role}</p>
                </div>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isMobile ? '0.85rem' : '0.9rem',
                  color: '#5a6a7a',
                  lineHeight: '1.6',
                  marginTop: '10px'
                }}>
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: isMobile ? '14px 32px' : '16px 48px',
              fontFamily: "'Bebas Neue', cursive",
              fontSize: isMobile ? '1.1rem' : '1.3rem',
              letterSpacing: '0.08em',
              borderRadius: '100px',
              border: 'none',
              background: '#4b8f87',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(75,143,135,0.3)',
              transition: 'all 0.3s ease',
              width: isMobile ? '80%' : 'auto',
              maxWidth: '300px'
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.boxShadow = '0 30px 50px rgba(75,143,135,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 20px 40px rgba(75,143,135,0.3)';
              }
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [activePage, setActivePage] = useState(0);
  const [featuresLiquidActive, setFeaturesLiquidActive] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [stats, setStats] = useState({
    active_projects: 0,
    active_users_percentage: 0,
    completed_tasks: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const sections = ['home', 'contents'];

  // Fetch statistics on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('https://accesspmt.bsit3a2025.com/api/landing_page/stats.php');
        const data = await response.json();
        
        if (data.status === 'success') {
          setStats({
            active_projects: data.data.active_projects,
            active_users_percentage: data.data.active_users_percentage,
            completed_tasks: data.data.completed_tasks
          });
        } else {
          console.error('Failed to fetch stats:', data.message);
          setStats({
            active_projects: 0,
            active_users_percentage: 0,
            completed_tasks: 0
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          active_projects: 0,
          active_users_percentage: 0,
          completed_tasks: 0
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
    
    const intervalId = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Format numbers for display (e.g., 5000000 -> 5M+)
  const formatNumber = (num) => {
    if (num === 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M+';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K+';
    }
    return num.toString();
  };

  // Format percentage for active users
  const formatPercentage = (num) => {
    if (num === 0) return '0%';
    return num + '%';
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavbarClick = (index) => {
    setActivePage(index);
    if (index === 1) {
      setFeaturesLiquidActive(true);
    } else {
      setFeaturesLiquidActive(false);
    }
    
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const featuresSection = document.getElementById('contents');
      if (featuresSection) {
        const rect = featuresSection.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= 0) {
          setFeaturesLiquidActive(true);
        } else {
          setFeaturesLiquidActive(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // For mobile, use vertical scrolling layout
  if (isMobile) {
    return (
      <>
        <Navbar setActivePage={handleNavbarClick} />
        
        {/* Landing Section */}
        <section id="home" style={{ 
          width: '100%', 
          minHeight: '100vh', 
          position: 'relative',
          overflow: 'hidden'
        }}>
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
          
          <div className="landingpage-badge">
            <span className="landingpage-badge-dot"></span>
            PROJECT MANAGEMENT TOOL
          </div>

          <div className="landingpage-title">
            <h1 className="landingpage-hero-title">
              Achieve more with a workspace built around you with
              <span className="landingpage-highlight">&nbsp;Access</span>
            </h1>
            
            <p className="landingpage-hero-subtitle">
              <ShinyText
                text="Streamline workflows, boost productivity, and watch your projects."
                disabled={false}
                speed={8}
                className="custom-class"
              />
            </p>
            
            <LandingpageButton />
            
            <div className="landingpage-stats">
              <div className="landingpage-stat-item">
                <strong className="landingpage-stat-number">
                  {statsLoading ? '...' : formatNumber(stats.active_projects)}
                </strong>
                <span className="landingpage-stat-label">Active Projects</span>
              </div>
              <div className="landingpage-stat-item">
                <strong className="landingpage-stat-number">
                  {statsLoading ? '...' : formatPercentage(stats.active_users_percentage)}
                </strong>
                <span className="landingpage-stat-label">Active Users</span>
              </div>
              <div className="landingpage-stat-item">
                <strong className="landingpage-stat-number">
                  {statsLoading ? '...' : formatNumber(stats.completed_tasks)}
                </strong>
                <span className="landingpage-stat-label">Tasks Completed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="contents" style={{ 
          width: '100%', 
          minHeight: '100vh', 
          position: 'relative',
          overflow: 'hidden',
          padding: '40px 0'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            opacity: featuresLiquidActive ? 0.4 : 0.2
          }}>
            <LiquidEther
              colors={[
                'rgba(75, 143, 135, 0.15)',
                'rgba(100, 180, 170, 0.1)',
                'rgba(200, 220, 230, 0.05)'
              ]}
              mouseForce={8}
              cursorSize={40}
              autoSpeed={0.03}
              autoIntensity={0.2}
              isViscous={false}
              viscous={60}
              iterationsViscous={24}
              iterationsPoisson={24}
              resolution={0.4}
              isBounce={false}
              autoDemo={false}
              takeoverDuration={0.2}
              autoResumeDelay={2000}
              autoRampDuration={0.4}
            />
          </div>
          
          <div style={{
            position: 'absolute',
            top: '5%',
            right: '-10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(75,143,135,0.03) 0%, rgba(75,143,135,0) 70%)',
            zIndex: 1,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '5%',
            left: '-10%',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(75,143,135,0.02) 0%, rgba(75,143,135,0) 70%)',
            zIndex: 1,
            pointerEvents: 'none'
          }} />
          
          <div className="landingpage-features-section" style={{ 
            background: 'transparent',
            position: 'relative', 
            zIndex: 2
          }}>
            <div className="landingpage-features-container">
              <div className="landingpage-section-header">
                <span className="landingpage-section-tag" style={{ color: '#4b8f87' }}>
                  WHY CHOOSE ACCESS
                </span>
                <h1 className='landingpage-content-title' style={{ color: '#1a2634' }}>
                  <span style={{ color: '#4b8f87' }}>ACCESS </span> 
                  YOUR PROJECTS AND COLLABORATE{' '}
                  <span style={{ color: '#4b8f87' }}> EFFICIENTLY </span> 
                  EVERY DAY.
                </h1>
              </div>
              
              <LandingpageProjectContent />
              
              <div className="landingpage-feature-pills">
                {["Real-time sync", "Role permissions", "File sharing", "Kanban boards", "Analytics"].map(pill => (
                  <span key={pill} className="landingpage-feature-pill">{pill}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </>
    );
  }

  // Desktop layout with horizontal scroll
  return (
    <>
      <Navbar setActivePage={handleNavbarClick} />

      <div style={{ width: '100vw', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: `${sections.length * 100}vw`,
            transform: `translateX(-${activePage * 100}vw)`,
            transition: 'transform 0.7s ease'
          }}
        >
          {/* Landing Section */}
          <section id="home" style={{ width: '100vw', height: '110vh', position: 'relative' }}>
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
            
            <div className="landingpage-badge">
              <span className="landingpage-badge-dot"></span>
              PROJECT MANAGEMENT TOOL
            </div>

            <div className="landingpage-title">
              <h1 className="landingpage-hero-title">
                Achieve more with a workspace built around you with
                <span className="landingpage-highlight">&nbsp;Access</span>
              </h1>
              
              <p className="landingpage-hero-subtitle">
                <ShinyText
                  text="Streamline workflows, boost productivity, and watch your projects."
                  disabled={false}
                  speed={8}
                  className="custom-class"
                />
              </p>
              
              <LandingpageButton />
              
              <div className="landingpage-stats">
                <div className="landingpage-stat-item">
                  <strong className="landingpage-stat-number">
                    {statsLoading ? '...' : formatNumber(stats.active_projects)}
                  </strong>
                  <span className="landingpage-stat-label">Active Projects</span>
                </div>
                <div className="landingpage-stat-item">
                  <strong className="landingpage-stat-number">
                    {statsLoading ? '...' : formatPercentage(stats.active_users_percentage)}
                  </strong>
                  <span className="landingpage-stat-label">Active Users</span>
                </div>
                <div className="landingpage-stat-item">
                  <strong className="landingpage-stat-number">
                    {statsLoading ? '...' : formatNumber(stats.completed_tasks)}
                  </strong>
                  <span className="landingpage-stat-label">Tasks Completed</span>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="contents" style={{ 
            width: '100vw', 
            minHeight: '100vh', 
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              opacity: featuresLiquidActive ? 0.4 : 0.2,
              transition: 'opacity 0.5s ease'
            }}>
              <LiquidEther
                colors={[
                  'rgba(75, 143, 135, 0.15)',
                  'rgba(100, 180, 170, 0.1)',
                  'rgba(200, 220, 230, 0.05)'
                ]}
                mouseForce={8}
                cursorSize={40}
                autoSpeed={0.03}
                autoIntensity={0.2}
                isViscous={false}
                viscous={60}
                iterationsViscous={24}
                iterationsPoisson={24}
                resolution={0.4}
                isBounce={false}
                autoDemo={false}
                takeoverDuration={0.2}
                autoResumeDelay={2000}
                autoRampDuration={0.4}
              />
            </div>
            
            <div style={{
              position: 'absolute',
              top: '10%',
              right: '-5%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(75,143,135,0.03) 0%, rgba(75,143,135,0) 70%)',
              zIndex: 1,
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '5%',
              left: '-5%',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(75,143,135,0.02) 0%, rgba(75,143,135,0) 70%)',
              zIndex: 1,
              pointerEvents: 'none'
            }} />
            
            <div className="landingpage-features-section" style={{ 
              background: 'transparent',
              position: 'relative', 
              zIndex: 2,
              backdropFilter: 'blur(2px)'
            }}>
              <div className="landingpage-features-container">
                <div className="landingpage-section-header">
                  <span className="landingpage-section-tag" style={{ color: '#4b8f87' }}>
                    WHY CHOOSE ACCESS
                  </span>
                  <h1 className='landingpage-content-title' style={{ 
                    color: '#1a2634',
                    textShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{ color: '#4b8f87' }}>ACCESS </span> 
                    YOUR PROJECTS AND <br />
                    COLLABORATE <span style={{ color: '#4b8f87' }}> EFFICIENTLY </span> 
                    EVERY DAY.
                  </h1>
                </div>
                
                <LandingpageProjectContent />
                
                <div className="landingpage-feature-pills">
                  {["Real-time sync", "Role permissions", "File sharing", "Kanban boards", "Analytics"].map(pill => (
                    <span key={pill} className="landingpage-feature-pill">{pill}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}

function LandingpageProjectContent() {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categories = [
    "TASK MANAGEMENT",
    "PROJECT DASHBOARD",
    "TEAM COLLABORATION",
    "KANBAN / BOARD VIEW",
    "DEADLINES AND REMINDERS"
  ];

  const slides = [
    { 
      tag: "PRODUCTIVITY",
      title: "TASK MANAGEMENT", 
      img: Task, 
      desc: "Create, assign, and track tasks to ensure everything gets done on time. Set priorities, add due dates, and watch your team's progress in real-time." 
    },
    { 
      tag: "ANALYTICS",
      title: "PROJECT DASHBOARD", 
      img: Project, 
      desc: "A centralized overview of your entire project — showing progress, completed and pending tasks, deadlines, and key metrics all in one glanceable view." 
    },
    { 
      tag: "TEAMWORK",
      title: "TEAM COLLABORATION", 
      img: Teams, 
      desc: "Communicate directly within the platform, share files, leave comments on tasks, and maintain a clear record of all project discussions." 
    },
    { 
      tag: "WORKFLOW",
      title: "KANBAN / BOARD VIEW", 
      img: Kanban, 
      desc: "Organize tasks visually with boards and columns — To Do, In Progress, Done — making it easy to see your entire workflow at a glance." 
    },
    { 
      tag: "AUTOMATION",
      title: "DEADLINES AND REMINDERS", 
      img: Notif, 
      desc: "Assign due dates to tasks and milestones. Get timely alerts and notifications to keep the project moving smoothly toward completion." 
    }
  ];

  return (
    <div className="landingpage-project-content-wrapper">
      {!isMobile && (
        <div className="landingpage-project-content-tabs">
          {categories.map((cat, i) => (
            <button
              key={i}
              className={`landingpage-project-content-tab ${active === i ? "active" : ""}`}
              onClick={() => setActive(i)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      
      {isMobile && (
        <select 
          className="landingpage-mobile-select"
          value={active}
          onChange={(e) => setActive(Number(e.target.value))}
          style={{
            width: '90%',
            margin: '20px auto',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(75,143,135,0.3)',
            background: 'white',
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#1a2634',
            display: 'block'
          }}
        >
          {categories.map((cat, i) => (
            <option key={i} value={i}>{cat}</option>
          ))}
        </select>
      )}
      
      <div className="landingpage-project-content-slider">
        <div className="landingpage-project-content-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {slides.map((s, i) => (
            <div className="landingpage-project-content-slide" key={i}>
              <div className="landingpage-project-content-image-box">
                <img src={s.img} alt={s.title} />
                <span className="landingpage-image-tag">{s.tag}</span>
              </div>
              <div className="landingpage-project-content-info">
                <span className="landingpage-content-tag">{s.tag}</span>
                <h2>{s.title}</h2>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="landingpage-dots-nav">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`landingpage-dot ${active === i ? "active" : ""}`}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function LandingpageButton() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="landingpage-button-container" style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '15px' : '20px',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <button 
        className="landingpage-getstarted" 
        onClick={() => navigate('/login')}
        style={{
          width: isMobile ? '200px' : 'auto',
          padding: isMobile ? '12px 24px' : '14px 32px'
        }}
      >
        Get Started →
      </button>
      <button 
        className="landingpage-learnmore" 
        onClick={() => navigate('/about')}
        style={{
          width: isMobile ? '200px' : 'auto',
          padding: isMobile ? '12px 24px' : '14px 32px'
        }}
      >
        About Us
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
        <Route path="/adminMainLayout" element={<AdminMainLayout />} />
        <Route path="/teacherMainLayout" element={<TeacherMainLayout />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;