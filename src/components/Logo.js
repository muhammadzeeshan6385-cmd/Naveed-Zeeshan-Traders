// src/components/Logo.js
import React from 'react';

const Logo = ({ className, style }) => {
  return (
    <img 
      src="/logo.png" 
      alt="Naveed & Zeeshan Traders" 
      className={className}
      style={{ ...style }}
    />
  );
};

export default Logo;