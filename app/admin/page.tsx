import type { Metadata } from 'next';
import GuestAdmin from './guest-admin';
export const metadata: Metadata = { title: 'Convidados · Niver da Bê', robots: { index: false, follow: false } };
export default function AdminPage() { return <GuestAdmin />; }
