import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2015;
  const version = "3.0.0";
  
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p className="footer-text">
          &copy; {startYear} - {currentYear} HRMIS v{version}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
