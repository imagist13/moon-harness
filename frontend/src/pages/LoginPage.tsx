import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { register, login } from '@/hooks/useApi'
import { useAuthStore } from '@/stores/authStore'
import { Sparkles, Zap, Shield, MessageSquare, Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, LogIn, ChevronDown, X } from 'lucide-react'

const FEATURES = [
  { icon: Zap, label: '智能Agent' },
  { icon: Shield, label: 'RAG知识库' },
  { icon: MessageSquare, label: '企业微信' },
]

const SAVED_ACCOUNTS_KEY = 'her-claw-saved-accounts'

function getSavedAccounts(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAccount(identity: string) {
  const accounts = getSavedAccounts()
  const trimmed = identity.trim()
  if (!trimmed) return
  const next = [trimmed, ...accounts.filter((a) => a !== trimmed)].slice(0, 10)
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next))
}

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<string[]>(getSavedAccounts())
  const identityRef = useRef<HTMLDivElement>(null)

  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (identityRef.current && !identityRef.current.contains(e.target as Node)) {
        setShowAccounts(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function getEmailOrPhone(): { email?: string; phone?: string } {
    const v = identity.trim()
    if (v.includes('@')) {
      return { email: v }
    }
    if (/^\d{6,15}$/.test(v)) {
      return { phone: v }
    }
    return { email: v }
  }

  function validate(): string | null {
    const v = identity.trim()
    if (!v) return '请输入邮箱或手机号'
    if (v.includes('@')) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) {
        return '邮箱格式不正确'
      }
    } else if (!/^\d{6,15}$/.test(v)) {
      return '手机号格式不正确（6-15位数字）'
    }
    if (password.length < 6) {
      return '密码至少需要6个字符'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errMsg = validate()
    if (errMsg) {
      toast.error(errMsg)
      return
    }
    setLoading(true)
    try {
      const { email, phone } = getEmailOrPhone()
      const result = mode === 'login'
        ? await login(email, phone, password)
        : await register(email, phone, password)
      saveAccount(identity)
      setAuth(result.token, result.user)
      toast.success(mode === 'login' ? '登录成功' : '注册成功')
    } catch (err: any) {
      toast.error(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  function removeAccount(acc: string) {
    const next = savedAccounts.filter((a) => a !== acc)
    setSavedAccounts(next)
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next))
  }

  function switchMode(newMode: 'login' | 'register') {
    setMode(newMode)
    setIdentity('')
    setPassword('')
    setShowPassword(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Background ambient orbs */}
      <div
        className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/15 blur-[120px]"
        style={{ animation: 'float 10s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-violet-500/10 blur-[140px]"
        style={{ animation: 'float 12s ease-in-out infinite 2s' }}
      />
      <div
        className="absolute top-[50%] left-[50%] w-[400px] h-[400px] rounded-full bg-blue-400/8 blur-[100px]"
        style={{ animation: 'float 8s ease-in-out infinite 4s' }}
      />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern opacity-[0.15]" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left: Brand */}
        <div className="hidden lg:flex flex-col items-start space-y-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20">
                <Sparkles size={32} className="text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-indigo-400/30 blur-xl animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                moon-harness
              </h1>
              <p className="text-sm text-indigo-300/60 mt-0.5 tracking-wide uppercase">Intelligent Agent Platform</p>
            </div>
          </div>

          <p className="text-xl text-indigo-100/70 leading-relaxed max-w-md">
            让 AI 成为你的工作伙伴，<br />
            构建智能、高效、可信赖的 Agent 生态。
          </p>

          <div className="flex flex-wrap gap-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-indigo-200/60 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 cursor-default"
              >
                <Icon size={14} className="text-indigo-400/70" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Card */}
        <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/20">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">moon-harness</span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                {mode === 'login' ? '欢迎回来' : '创建账号'}
              </h2>
              <p className="text-sm text-indigo-200/40 mt-2">
                {mode === 'login' ? '登录你的账号继续探索' : '注册一个新账号开始使用'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-indigo-200/50 ml-1">邮箱 / 手机号</label>
                <div className="relative group" ref={identityRef}>
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300/30 group-focus-within:text-indigo-400/60 transition-colors z-10" />
                  <Input
                    type="text"
                    autoComplete="username"
                    placeholder="请输入邮箱或手机号"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    onFocus={() => savedAccounts.length > 0 && setShowAccounts(true)}
                    className="pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/20 focus:bg-white/[0.06] transition-all duration-300"
                  />
                  {savedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAccounts((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-300/30 hover:text-indigo-200/60 transition-colors z-10"
                    >
                      <ChevronDown size={16} className={showAccounts ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                  )}
                  {showAccounts && savedAccounts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-white/[0.08] bg-[#1a1f3a]/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden">
                      <div className="py-1">
                        {savedAccounts.map((acc) => (
                          <div
                            key={acc}
                            className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors"
                            onClick={() => {
                              setIdentity(acc)
                              setShowAccounts(false)
                            }}
                          >
                            <span className="text-sm text-indigo-100/70 truncate">{acc}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeAccount(acc)
                              }}
                              className="p-1 rounded-md hover:bg-white/[0.08] text-indigo-300/30 hover:text-indigo-200/60 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-indigo-200/50 ml-1">密码</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300/30 group-focus-within:text-indigo-400/60 transition-colors" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="请输入密码（至少6位）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 rounded-xl focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/20 focus:bg-white/[0.06] transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-300/30 hover:text-indigo-200/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    请稍候...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                    {mode === 'login' ? '登录' : '注册'}
                    <ArrowRight size={16} className="opacity-60" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-sm text-indigo-200/40">
                {mode === 'login' ? '还没有账号？' : '已有账号？'}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="ml-1.5 text-indigo-300/70 hover:text-indigo-200 font-medium transition-colors duration-200"
                >
                  {mode === 'login' ? '去注册' : '去登录'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
