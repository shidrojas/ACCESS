import React, { useState, useEffect } from "react";
import '../navigationbar/navbar.css';
import { FaFacebookF, FaInstagram, FaDiscord } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h2>ACCESS<span className="footer-dot">.</span></h2>
          <p className="footer-slogan">
            Achieve more with a workspace built around you with
            <span className="footer-highlight">&nbsp;Access</span>
          </p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <span 
          className="footer-bottom-link" 
          onClick={() => setShowPrivacy(true)}
          style={{ cursor: 'pointer' }}
        >
          Privacy Policy
        </span>
        <span 
          className="footer-bottom-link" 
          onClick={() => setShowTerms(true)}
          style={{ cursor: 'pointer' }}
        >
          Terms & Agreement
        </span>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className={`modal-content ${windowWidth < 768 ? 'mobile-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPrivacy(false)}>×</button>
            <h2>Privacy Policy</h2>
            <div className="modal-body">
              <h3>1. Information We Collect</h3>
              <p>We collect information you provide directly to us, such as when you create an account, use our services, or communicate with us. This may include:</p>
              <ul>
                <li>Name and contact information</li>
                <li>Account credentials</li>
                <li>Project and task data</li>
                <li>Communication preferences</li>
              </ul>

              <h3>2. How We Use Your Information</h3>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Protect against fraud and unauthorized access</li>
              </ul>

              <h3>3. Sharing of Information</h3>
              <p>We do not share your personal information with third parties except in the following circumstances:</p>
              <ul>
                <li>With your consent</li>
                <li>For legal reasons (compliance with laws, legal process)</li>
                <li>To protect rights and safety</li>
                <li>With service providers who perform services on our behalf</li>
              </ul>

              <h3>4. Data Security</h3>
              <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

              <h3>5. Your Rights</h3>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>

              <h3>6. Cookies and Tracking</h3>
              <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve and analyze our service.</p>

              <h3>7. Changes to This Policy</h3>
              <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

              <p className="modal-footer"><strong>Last updated:</strong> March 2025</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Agreement Modal */}
      {showTerms && (
        <div className="modal-overlay" onClick={() => setShowTerms(false)}>
          <div className={`modal-content ${windowWidth < 768 ? 'mobile-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTerms(false)}>×</button>
            <h2>Terms & Agreement</h2>
            <div className="modal-body">
              <h3>1. Acceptance of Terms</h3>
              <p>By accessing or using Access, you agree to be bound by these Terms. If you do not agree to these terms, please do not use our services.</p>

              <h3>2. Description of Service</h3>
              <p>Access provides a project management platform that allows users to create, manage, and collaborate on projects and tasks.</p>

              <h3>3. User Accounts</h3>
              <ul>
                <li>You must be at least 13 years old to use this service</li>
                <li>You are responsible for maintaining account security</li>
                <li>You are responsible for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>

              <h3>4. User Responsibilities</h3>
              <p>You agree to:</p>
              <ul>
                <li>Provide accurate and complete information</li>
                <li>Use the service in compliance with all applicable laws</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Not engage in any activity that disrupts the service</li>
                <li>Not attempt to gain unauthorized access to the service</li>
              </ul>

              <h3>5. Intellectual Property Rights</h3>
              <p>The service and its original content, features, and functionality are owned by Access and are protected by copyright, trademark, and other intellectual property laws.</p>

              <h3>6. User Content</h3>
              <ul>
                <li>You retain ownership of your content</li>
                <li>You grant us a license to host and display your content</li>
                <li>You represent that you have the rights to your content</li>
                <li>We may remove content that violates these terms</li>
              </ul>

              <h3>7. Subscription and Payments</h3>
              <ul>
                <li>Subscription fees are non-refundable except as required by law</li>
                <li>We may change fees with 30 days notice</li>
                <li>Free trials may be offered at our discretion</li>
                <li>You are responsible for all taxes</li>
              </ul>

              <h3>8. Termination</h3>
              <p>We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the service.</p>

              <h3>9. Limitation of Liability</h3>
              <p>To the maximum extent permitted by law, Access shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>

              <h3>10. Indemnification</h3>
              <p>You agree to indemnify and hold Access harmless from any claims arising out of your use of the service or violation of these Terms.</p>

              <h3>11. Governing Law</h3>
              <p>These Terms shall be governed by the laws of [Your Jurisdiction] without regard to its conflict of law provisions.</p>

              <h3>12. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>

              <p className="modal-footer"><strong>Last updated:</strong> March 2025</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
          padding: 16px;
        }

        .modal-content {
          background: #1a2634;
          border: 1px solid rgba(75,143,135,0.2);
          border-radius: 24px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
          padding: 40px;
          color: #e6e8f0;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.3s ease;
          width: 100%;
        }

        .mobile-modal {
          padding: 24px 20px;
          max-height: 85vh;
          border-radius: 20px;
        }

        .modal-content h2 {
          font-family: 'Bebas Neue', cursive;
          font-size: clamp(1.8rem, 5vw, 2.5rem);
          color: #65bdb4;
          margin-bottom: 20px;
          letter-spacing: 0.04em;
          border-bottom: 1px solid rgba(75,143,135,0.3);
          padding-bottom: 15px;
          padding-right: 40px;
        }

        .modal-content h3 {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(1.1rem, 4vw, 1.3rem);
          font-weight: 700;
          color: #65bdb4;
          margin: 20px 0 10px;
        }

        .modal-content p,
        .modal-content li {
          font-family: 'Inter', sans-serif;
          font-size: clamp(0.85rem, 3vw, 0.95rem);
          color: #7a8290;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .modal-content ul {
          margin-bottom: 15px;
          padding-left: 20px;
        }

        .modal-close {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #7a8290;
          font-size: 1.8rem;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .modal-close:hover {
          background: rgba(75,143,135,0.2);
          color: #65bdb4;
        }

        .modal-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid rgba(75,143,135,0.3);
          font-family: 'Rajdhani', sans-serif !important;
          color: #65bdb4 !important;
          font-size: clamp(0.85rem, 3vw, 1rem);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbar styling */
        .modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: rgba(75,143,135,0.3);
          border-radius: 10px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
          background: rgba(75,143,135,0.5);
        }

        /* Tablet Styles */
        @media (max-width: 768px) {
          .modal-content {
            max-width: 90%;
            padding: 30px 24px;
          }
        }

        /* Mobile Styles */
        @media (max-width: 480px) {
          .modal-content {
            padding: 24px 16px;
            max-height: 90vh;
            border-radius: 20px;
          }

          .modal-close {
            top: 12px;
            right: 12px;
            width: 35px;
            height: 35px;
            font-size: 1.6rem;
          }

          .modal-content ul {
            padding-left: 16px;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;