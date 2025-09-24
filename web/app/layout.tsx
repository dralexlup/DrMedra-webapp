import React from 'react'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'

export const metadata = {
  title: 'DrMedra Medical Assistant',
  description: 'AI-powered medical assistant platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
