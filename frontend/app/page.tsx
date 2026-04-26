'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-slate-900/50 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">✨</span>
              </div>
              <h1 className="text-xl font-bold text-white">Ametista Tarot</h1>
            </div>
            <div className="flex space-x-4">
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="px-4 py-2 text-purple-200 hover:text-purple-100">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token')
                      setIsLoggedIn(false)
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 text-purple-200 hover:text-purple-100">
                    Login
                  </Link>
                  <Link href="/register" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition">
                    Registrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Bem-vindo ao Ametista Tarot
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Conecte-se com consultores especializados em cartomancia, tarot e astrologia
          </p>
          {!isLoggedIn && (
            <Link
              href="/register"
              className="inline-block px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold rounded-lg transition transform hover:scale-105"
            >
              Começar Agora
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/50 transition">
            <div className="text-3xl mb-4">🔮</div>
            <h3 className="text-xl font-bold text-white mb-2">Consultores Experientes</h3>
            <p className="text-purple-200">Acesso a consultores especializados em diversas práticas espirituais</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/50 transition">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-white mb-2">Chat em Tempo Real</h3>
            <p className="text-purple-200">Comunicação instantânea com seus consultores favoritos</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/50 transition">
            <div className="text-3xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-white mb-2">Privacidade Garantida</h3>
            <p className="text-purple-200">Suas informações pessoais são protegidas com segurança de ponta</p>
          </div>
        </div>
      </div>
    </main>
  )
}
