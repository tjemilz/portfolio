import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-4 px-6 border-t">
      <div className="container mx-auto flex justify-center items-center">
        <p className="text-black text-sm">
          &copy; {currentYear} My Portfolio. Created by Emilien Fourgnier. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;