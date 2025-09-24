import React from 'react'
import './globals.css'

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
        {children}
      </body>
    </html>
  )
}
