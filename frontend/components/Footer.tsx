import Link from 'next/link'
import { Logo } from './Logo'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-white/5 bg-ink-900/60 backdrop-blur-xl mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo size="md" />
            <p className="mt-4 text-sm text-ink-200/80 max-w-md leading-relaxed">
              Conectando você a cartomantes e taróloga(o)s especializados, com privacidade,
              acolhimento e respostas claras quando você precisar.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm text-ink-200/80">
              <li><Link href="/#como-funciona" className="hover:text-white">Como funciona</Link></li>
              <li><Link href="/#consultores" className="hover:text-white">Consultores</Link></li>
              <li><Link href="/register" className="hover:text-white">Criar conta</Link></li>
              <li><Link href="/consultant-login" className="hover:text-white">Sou consultor</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">Suporte</h4>
            <ul className="space-y-2 text-sm text-ink-200/80">
              <li><a href="mailto:contato@ametistatarot.com" className="hover:text-white">contato@ametistatarot.com</a></li>
              <li><Link href="/#faq" className="hover:text-white">Dúvidas frequentes</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-ink-300/70">
          <p>© {year} Ametista Tarot. Todos os direitos reservados.</p>
          <p>Atendimento online · Pagamento seguro · Privacidade garantida</p>
        </div>
      </div>
    </footer>
  )
}
