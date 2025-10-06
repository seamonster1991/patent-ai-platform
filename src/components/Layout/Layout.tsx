import React from 'react';
import { Toaster } from 'sonner';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-ms-soft">
      {/* Global Wallpaper Background */}
      <div className="fixed inset-0 bg-ms-white -z-10" />
      
      {/* Navigation */}
      <Navbar />
      
      {/* Main Content */}
      <main className="relative z-10 pt-16">
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--ms-bg))',
            border: '1px solid rgb(var(--ms-line))',
            color: 'rgb(var(--ms-text))',
            borderRadius: '8px',
            boxShadow: 'var(--ms-shadow-lg)',
            fontSize: '14px',
            fontWeight: '500',
          },
          className: 'ms-toast',
        }}
        theme="light"
        richColors
        closeButton
        duration={4000}
      />
    </div>
  );
};

export default Layout;