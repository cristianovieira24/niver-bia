import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Niver da Bê · 19.12',description:'Vem comemorar comigo! Dia 19 de dezembro, às 14h. Confirme sua presença.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><head><link rel="preload" as="image" href="/assets/satin-bow.webp"/><link rel="preload" as="image" href="/assets/be-pose-v2.webp"/><link rel="preload" as="image" href="/assets/rose-scene.webp"/></head><body>{children}</body></html>}
