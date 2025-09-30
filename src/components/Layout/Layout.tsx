import { ReactNode } from 'react'
import Navbar from './Navbar'
import { Toaster } from 'sonner'

interface LayoutProps {
  children: ReactNode
  className?: string
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}