import type { Route } from './+types/login';
import { seo } from '@/lib/seo';
import { LoginForm } from '@/components/auth/login-form';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Sign in — Ghost space | LGN', description: 'Sign in to your private Ghost space to track your application, manage your pseudonymous profile, and submit your contributions to the network.', noindex: true }); }
export default function Login() { return <main className="login-wrap"><span className="eyebrow"><span className="tiny-dot"/> PRIVATE ACCESS / PUBLIC WORK</span><h1>Ghost space<span className="accent-period">.</span></h1><p className="muted-note">Your identity stays private. Your work makes the connection.</p><LoginForm/></main>; }
