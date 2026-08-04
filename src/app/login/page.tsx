import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { LoginForm } from "./LoginForm"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>
      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-2xl shadow-2xl relative z-10 text-white">
        <CardHeader className="space-y-2 text-center pb-8 pt-8">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1-2.2l-3.3-2.5a2 2 0 0 0-1.2-.5H12M8 12h-3a1 1 0 0 0-1 1v4c0 .6.4 1 1 1h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M12 11V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v8"/><path d="M12 7H2"/></svg>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">POS Carwash</CardTitle>
          <CardDescription className="text-slate-400"></CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
