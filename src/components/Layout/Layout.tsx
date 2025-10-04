import { ReactNode } from 'react'
import Navbar from './Navbar'
import { Toaster } from 'sonner'

interface LayoutProps {
  children: ReactNode
  className?: string
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen relative bg-transparent transition-colors overflow-hidden">
      {/* Global bold wallpaper */}
      <div className="ms-wallpaper" aria-hidden="true" />
      <Navbar />
      <main className="pt-16 ms-container">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}