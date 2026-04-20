'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Search, Plus, Settings,
  ChevronRight, ExternalLink, Code, Eye, Filter, Download, RefreshCw,
  BarChart3, PieChart, TrendingUp, Clock, Globe, FileCode, Zap, Lock,
  Users, Building2, CreditCard, Bell, HelpCircle, LogOut, Moon, Sun,
  Menu, X, ArrowRight, Play, Pause, Trash2, Edit, Copy, Check, AlertCircle,
  ChevronDown, MoreHorizontal, Layers, Activity, Target, Award, Briefcase,
  Github, Sparkles, BookOpen, MessageSquare, Terminal, Loader2, FileText,
  Link2, Keyboard, Type, Palette, Monitor, EyeOff, Volume2, Timer, Calendar,
  TrendingDown, Minus, ExternalLink as ExternalLinkIcon, Send, XCircle as XIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, AreaChart, 
  Area, BarChart, Bar, Legend, ComposedChart, Scatter 
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  useProjects, useCreateProject,
  useViolations, useViolationStats, useUpdateViolationStatus,
  useScans, useCreateScan,
  useRemediation, useGenerateRemediation
} from '@/hooks/useApi';
import type { View, Project, Violation, Severity, ViolationStatus, CreateProjectInput } from '@/types';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6'
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: 'bg-red-500/10',
  serious: 'bg-orange-500/10',
  moderate: 'bg-yellow-500/10',
  minor: 'bg-blue-500/10'
};

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-red-500',
  serious: 'text-orange-500',
  moderate: 'text-yellow-500',
  minor: 'text-blue-500'
};

const WCAG_LEVELS = ['A', 'AA', 'AAA'] as const;
const WCAG_CATEGORIES = ['perceivable', 'operable', 'understandable', 'robust'] as const;

interface TrendData {
  date: string;
  violations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  fixed: number;
}

// Generate sample trend data
const generateTrendData = (): TrendData[] => {
  const data: TrendData[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const baseViolations = 50 - Math.floor(i * 0.5);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      violations: Math.max(5, baseViolations + Math.floor(Math.random() * 10)),
      critical: Math.max(1, Math.floor(baseViolations * 0.15) + Math.floor(Math.random() * 3)),
      serious: Math.max(2, Math.floor(baseViolations * 0.35) + Math.floor(Math.random() * 5)),
      moderate: Math.max(1, Math.floor(baseViolations * 0.35) + Math.floor(Math.random() * 3)),
      minor: Math.max(0, Math.floor(baseViolations * 0.15)),
      fixed: Math.floor(Math.random() * 5)
    });
  }
  
  return data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getSeverityBadge = (severity: Severity) => {
  const styles: Record<Severity, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    serious: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    moderate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    minor: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  };
  return styles[severity];
};

const getStatusBadge = (status: ViolationStatus) => {
  const styles: Record<ViolationStatus, string> = {
    open: 'bg-red-500/10 text-red-500',
    fixed: 'bg-emerald-500/10 text-emerald-500',
    ignored: 'bg-gray-500/10 text-gray-500',
    false_positive: 'bg-blue-500/10 text-blue-500'
  };
  return styles[status];
};

const getRiskColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
};

const getRiskGradient = (score: number): string => {
  if (score >= 80) return 'from-emerald-500 to-emerald-600';
  if (score >= 60) return 'from-yellow-500 to-yellow-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
};

const getRiskLabel = (score: number): string => {
  if (score >= 80) return 'Low Risk';
  if (score >= 60) return 'Medium Risk';
  if (score >= 40) return 'High Risk';
  return 'Critical Risk';
};

const formatDate = (date: string | Date | null): string => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

// ============================================================================
// LANDING PAGE COMPONENT
// ============================================================================

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Shield,
      title: 'Real WCAG Scanning',
      description: 'Puppeteer-powered headless browser scans your actual website for WCAG 2.1 AA violations.',
      details: ['axe-core integration', 'Custom rule detection', 'Screenshot capture', 'CI/CD pipeline ready']
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Remediation',
      description: 'GPT-4 generates exact code fixes for each violation with explanations.',
      details: ['Context-aware fixes', 'Framework detection', 'Copy-paste ready', 'Confidence scores']
    },
    {
      icon: Github,
      title: 'GitHub Integration',
      description: 'Automatically create Pull Requests with accessibility fixes.',
      details: ['OAuth installation', 'Branch creation', 'PR automation', 'Monorepo support']
    },
    {
      icon: FileText,
      title: 'Legal Shield™ Reports',
      description: 'Generate timestamped PDF reports for lawsuit defense.',
      details: ['WCAG compliance proof', 'Timestamped audits', 'Custom branding', 'Legal documentation']
    },
    {
      icon: Activity,
      title: 'Continuous Monitoring',
      description: '24/7 scanning with alerts when new violations are introduced.',
      details: ['Scheduled scans', 'Email alerts', 'Slack integration', 'Webhook notifications']
    },
    {
      icon: Users,
      title: 'Agency White-Label',
      description: 'Resell AccessGuard with your branding. Perfect for agencies.',
      details: ['Custom domains', 'Brand customization', 'Client management', 'Wholesale pricing']
    }
  ];

  const comparison = [
    { feature: 'Scans actual code', overlay: false, accessguard: true },
    { feature: 'AI-generated fixes', overlay: false, accessguard: true },
    { feature: 'GitHub PR creation', overlay: false, accessguard: true },
    { feature: 'CI/CD integration', overlay: false, accessguard: true },
    { feature: 'Legal Shield™ reports', overlay: false, accessguard: true },
    { feature: 'Works without JS', overlay: false, accessguard: true },
    { feature: 'Lawsuit defense ready', overlay: false, accessguard: true },
  ];

  const pricing = [
    {
      name: 'Starter',
      price: 49,
      period: 'month',
      description: 'Perfect for small websites and personal projects',
      features: [
        '1 website',
        '100 pages/month',
        'Basic WCAG scanning',
        'Email reports',
        'API access',
        'Community support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Agency',
      price: 199,
      period: 'month',
      description: 'For agencies managing multiple client websites',
      features: [
        '10 websites',
        '1,000 pages/month',
        'AI remediation code',
        'GitHub integration',
        'White-label reports',
        'Priority support',
        'Client management',
        'Custom branding'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: null,
      period: 'custom',
      description: 'For large organizations with custom needs',
      features: [
        'Unlimited websites',
        'Custom page limits',
        'CI/CD integration',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option',
        'SSO/SAML',
        'Custom integrations'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const faqs = [
    {
      q: 'How is AccessGuard different from overlay widgets like accessiBe?',
      a: 'Overlay widgets add a JavaScript layer that attempts to fix accessibility issues at runtime. However, they\'ve been subject to lawsuits alleging they don\'t provide true accessibility. AccessGuard scans your actual code and generates real fixes that you commit to your codebase—making your site genuinely accessible.'
    },
    {
      q: 'Can AccessGuard prevent ADA lawsuits?',
      a: 'While no tool can guarantee immunity, AccessGuard helps demonstrate good-faith compliance efforts. Our timestamped audit reports, continuous monitoring, and documented remediation provide evidence of ongoing accessibility efforts—a key factor in legal defense.'
    },
    {
      q: 'How accurate is the AI remediation?',
      a: 'Our GPT-4 powered remediation has an average confidence score of 92%. Each fix includes an explanation so developers can understand and verify the change before applying. We recommend code review before merging any automated fixes.'
    },
    {
      q: 'Does AccessGuard work with React/Vue/Angular?',
      a: 'Yes! AccessGuard scans the rendered DOM, so it works with any JavaScript framework. For AI remediation, we detect your framework and generate appropriate code (JSX for React, SFC for Vue, etc.).'
    },
    {
      q: 'What happens after I add a website?',
      a: 'We immediately queue your site for scanning. Our Puppeteer bot visits each page, runs axe-core and custom accessibility checks, captures screenshots of violations, and generates AI remediation suggestions—all within minutes.'
    },
    {
      q: 'Can I integrate AccessGuard into my CI/CD pipeline?',
      a: 'Absolutely! Use our GitHub Action to scan on every pull request. Block merges that introduce critical violations, track accessibility over time, and enforce compliance as part of your development workflow.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-coral" />
              <span className="text-xl font-bold">AccessGuard</span>
              <Badge variant="outline" className="ml-2 border-emerald-500/20 text-emerald-500 text-xs">
                Lawsuit Defense Ready™
              </Badge>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#comparison" className="text-muted-foreground hover:text-foreground transition-colors">Comparison</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onGetStarted}>Sign In</Button>
              <Button onClick={onGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground">
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Developer-First Solution
                </Badge>
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 px-3 py-1">
                  <Shield className="h-3 w-3 mr-1" />
                  WCAG 2.1 AA Compliant
                </Badge>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Prevent <span className="text-coral">$50k+ ADA Lawsuits</span>
                <br />
                <span className="text-muted-foreground">Before They Cost You</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Unlike overlay widgets that lawsuits allege don't work, AccessGuard scans your <strong className="text-foreground">actual code</strong>, 
                generates <strong className="text-foreground">AI-powered fixes</strong>, and integrates into your <strong className="text-foreground">CI/CD pipeline</strong>.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
                <Button size="lg" onClick={onGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground h-14 px-8 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  14-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Cancel anytime
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Dashboard Preview */}
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="text-xs text-muted-foreground">app.accessguard.io/dashboard</div>
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <div className="w-4 h-4 rounded bg-muted" />
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Risk Score', value: '78', icon: Target, trend: '+5', color: 'emerald' },
                      { label: 'Critical', value: '12', icon: AlertCircle, trend: '-3', color: 'red' },
                      { label: 'Serious', value: '45', icon: AlertTriangle, trend: '-8', color: 'orange' },
                      { label: 'Scans', value: '156', icon: Activity, trend: '+12', color: 'coral' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-muted/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <stat.icon className={`h-4 w-4 text-${stat.color}-500`} />
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className={`text-xs ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'} mt-1`}>
                          {stat.trend} this week
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart Placeholder */}
                  <div className="bg-muted/30 rounded-xl p-4 h-40 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <span className="text-sm">Violation Trends</span>
                    </div>
                  </div>
                  
                  {/* Violations List */}
                  <div className="space-y-2">
                    {[
                      { severity: 'critical', title: 'Missing form labels', page: '/checkout' },
                      { severity: 'serious', title: 'Low color contrast', page: '/products' },
                      { severity: 'moderate', title: 'Missing alt text', page: '/about' }
                    ].map((v, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${v.severity === 'critical' ? 'bg-red-500' : v.severity === 'serious' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                        <span className="text-sm flex-1">{v.title}</span>
                        <span className="text-xs text-muted-foreground">{v.page}</span>
                        <Button variant="ghost" size="sm" className="h-7">Fix</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -right-4 top-20 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
              >
                <Check className="inline h-4 w-4 mr-1" />
                WCAG 2.1 AA Compliant
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="absolute -left-4 bottom-40 bg-card border border-border px-4 py-3 rounded-lg shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  <span className="text-sm font-medium">PR Created</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by companies preventing ADA lawsuits</p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-50">
            {['TechCorp', 'StartupX', 'EnterpriseCo', 'AgencyPro', 'RetailMax'].map((name) => (
              <div key={name} className="text-xl font-bold text-muted-foreground">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-coral/20 text-coral">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why AccessGuard Beats Overlay Widgets
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlike accessiBe and other overlays (which lawsuits allege don't work), 
              AccessGuard scans your actual code and generates real fixes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <Card className={`h-full hover:border-coral/30 transition-all cursor-pointer ${activeFeature === i ? 'border-coral/30 shadow-lg' : ''}`}>
                  <CardHeader>
                    <div className={`p-3 rounded-xl w-fit mb-3 ${activeFeature === i ? 'bg-coral/10' : 'bg-muted/50'}`}>
                      <feature.icon className={`h-6 w-6 ${activeFeature === i ? 'text-coral' : 'text-muted-foreground'}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.details.map((detail, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-coral/20 text-coral">Comparison</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Overlay Widget vs. AccessGuard
            </h2>
            <p className="text-lg text-muted-foreground">
              See why developers choose real code fixes over JavaScript overlays
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Overlay Widget */}
            <Card className="border-red-500/20">
              <CardHeader className="text-center border-b border-border pb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <CardTitle>Overlay Widgets</CardTitle>
                <CardDescription>accessiBe, UserWay, AudioEye, etc.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Lawsuits claim they don't work</strong> - Multiple plaintiffs have sued companies using overlays</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Band-aid solution</strong> - Doesn't fix actual code, just covers it up</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Can break functionality</strong> - JavaScript conflicts with existing code</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span><strong>No CI/CD integration</strong> - Can't catch issues before deployment</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span><strong>No developer control</strong> - Third-party script you can't customize</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Requires JavaScript</strong> - Doesn't work for users who disable JS</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* AccessGuard */}
            <Card className="border-emerald-500/20 shadow-lg shadow-emerald-500/5">
              <CardHeader className="text-center border-b border-border pb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <CardTitle className="flex items-center justify-center gap-2">
                  AccessGuard
                  <Badge className="bg-coral text-coral-foreground">Recommended</Badge>
                </CardTitle>
                <CardDescription>Developer-first accessibility platform</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Fixes actual code</strong> - Real commits, real changes, real accessibility</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>AI-generated fixes</strong> - GPT-4 produces exact code remediation</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>GitHub PR creation</strong> - Auto-create PRs with accessibility fixes</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>CI/CD integration</strong> - Block deployments with violations</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Legal Shield™ reports</strong> - Document compliance for legal defense</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Works without JS</strong> - Server-side scanning of HTML</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-coral/20 text-coral">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, i) => (
              <Card
                key={i}
                className={`relative ${plan.popular ? 'border-coral shadow-lg shadow-coral/10 scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-coral text-coral-foreground px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center pt-4">
                  <div className="mb-6">
                    {plan.price !== null ? (
                      <>
                        <span className="text-5xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/{plan.period}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">Custom</span>
                    )}
                  </div>
                  <ul className="space-y-3 text-left mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full h-12 ${plan.popular ? 'bg-coral hover:bg-coral/90 text-coral-foreground' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={onGetStarted}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">Need more? All plans include:</p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {['14-day free trial', 'No credit card required', 'Cancel anytime', 'Email support'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-coral/20 text-coral">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-coral flex-shrink-0 mt-0.5" />
                    {faq.q}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-coral/5 via-card to-emerald/5 border-coral/20">
            <CardContent className="pt-16 pb-12 text-center">
              <Shield className="h-20 w-20 text-coral mx-auto mb-8" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Ready to Make Your Site Accessible?
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join hundreds of companies using AccessGuard to prevent ADA lawsuits 
                and build a more accessible web for everyone.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={onGetStarted} className="bg-coral hover:bg-coral/90 text-coral-foreground h-14 px-10 text-lg">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-7 w-7 text-coral" />
                <span className="text-lg font-bold">AccessGuard</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Making the web accessible, one commit at a time. Prevent lawsuits, protect users, build better products.
              </p>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  SOC 2 Compliant
                </Badge>
                <Badge variant="outline" className="border-coral/20 text-coral text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  GDPR Ready
                </Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GitHub Action</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <Separator className="mb-8" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2024 AccessGuard. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <ExternalLink className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <MessageSquare className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// DASHBOARD COMPONENTS
// ============================================================================

const Sidebar = ({ activeView, setActiveView, isMobile, onClose }: {
  activeView: View;
  setActiveView: (view: View) => void;
  isMobile?: boolean;
  onClose?: () => void;
}) => {
  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: BarChart3 },
    { id: 'projects' as View, label: 'Projects', icon: Globe },
    { id: 'violations' as View, label: 'Violations', icon: AlertTriangle },
    { id: 'scans' as View, label: 'Scan History', icon: Activity },
    { id: 'reports' as View, label: 'Reports', icon: FileText },
    { id: 'settings' as View, label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`flex flex-col h-full bg-sidebar ${isMobile ? '' : 'w-64 border-r border-sidebar-border'}`}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-coral" />
            <span className="text-lg font-bold">AccessGuard</span>
          </div>
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                activeView === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
              onClick={() => {
                setActiveView(item.id);
                if (isMobile && onClose) onClose();
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-coral/20 text-coral text-sm">DU</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Demo User</p>
            <p className="text-xs text-muted-foreground truncate">demo@accessguard.io</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const DashboardHeader = ({ onMenuClick, title, subtitle }: { 
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}) => {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search violations, projects..."
              className="w-72 pl-9 bg-muted/50"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help & Support</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

const DashboardView = () => {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: statsData } = useViolationStats();
  const { data: violationsData } = useViolations({ limit: 5 });
  const { data: scansData } = useScans(undefined, 5);

  const trendData = useMemo(() => generateTrendData(), []);

  const stats = statsData?.severity || { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 };
  const avgRiskScore = projects && projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.riskScore || 0), 0) / projects.length)
    : 0;

  const pieData = [
    { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
    { name: 'Serious', value: stats.serious, color: SEVERITY_COLORS.serious },
    { name: 'Moderate', value: stats.moderate, color: SEVERITY_COLORS.moderate },
    { name: 'Minor', value: stats.minor, color: SEVERITY_COLORS.minor },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your accessibility compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
            <RefreshCw className="h-4 w-4 mr-2" />
            Scan All
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getRiskGradient(avgRiskScore)}`} />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                <p className={`text-3xl font-bold mt-1 ${getRiskColor(avgRiskScore)}`}>
                  {avgRiskScore}<span className="text-lg text-muted-foreground">/100</span>
                </p>
                <Badge variant="outline" className={`mt-2 ${getRiskColor(avgRiskScore)}`}>
                  {getRiskLabel(avgRiskScore)}
                </Badge>
              </div>
              <div className={`p-3 rounded-xl ${avgRiskScore >= 60 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <Target className={`h-6 w-6 ${getRiskColor(avgRiskScore)}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Violations</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
                  <TrendingDown className="h-3 w-3" />
                  <span>12% from last week</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-3xl font-bold mt-1 text-red-500">{stats.critical}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span>Requires immediate attention</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projects</p>
                <p className="text-3xl font-bold mt-1">{projects?.length || 0}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>Active monitoring</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-coral/10">
                <Globe className="h-6 w-6 text-coral" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Violation Trends</CardTitle>
                <CardDescription>30-day violation history</CardDescription>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--coral)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--coral)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="violations"
                    stroke="var(--coral)"
                    fillOpacity={1}
                    fill="url(#colorViolations)"
                    strokeWidth={2}
                  />
                  <Line type="monotone" dataKey="critical" stroke="var(--critical)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="serious" stroke="var(--serious)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-coral" />
                <span className="text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" />
                <span className="text-muted-foreground">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-orange-500" />
                <span className="text-muted-foreground">Serious</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Severity Distribution</CardTitle>
            <CardDescription>Current open violations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'None', value: 1, color: '#888' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {(pieData.length > 0 ? pieData : [{ name: 'None', value: 1, color: '#888' }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
                { label: 'Serious', value: stats.serious, color: SEVERITY_COLORS.serious },
                { label: 'Moderate', value: stats.moderate, color: SEVERITY_COLORS.moderate },
                { label: 'Minor', value: stats.minor, color: SEVERITY_COLORS.minor },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="text-sm font-semibold">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Violations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Violations</CardTitle>
                <CardDescription>Latest detected issues</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(violationsData) && violationsData.slice(0, 5).map((v) => (
                <div
                  key={v.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={`p-2 rounded-lg ${SEVERITY_BG[v.severity]}`}>
                    <AlertTriangle className={`h-4 w-4 ${SEVERITY_TEXT[v.severity]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{v.ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <Badge variant="outline" className={`text-xs ${getSeverityBadge(v.severity)}`}>
                        {v.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{v.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span className="truncate">{v.url}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
              {(!Array.isArray(violationsData) || violationsData.length === 0) && (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p>No violations found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Scans</CardTitle>
                <CardDescription>Latest scan activity</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scansData?.slice(0, 5).map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className={`p-2 rounded-lg ${
                    scan.status === 'completed' ? 'bg-emerald-500/10' :
                    scan.status === 'running' ? 'bg-blue-500/10' :
                    scan.status === 'failed' ? 'bg-red-500/10' : 'bg-gray-500/10'
                  }`}>
                    {scan.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : scan.status === 'running' ? (
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : scan.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{scan.project?.name || 'Unknown'}</span>
                      <Badge variant="outline" className={`text-xs ${
                        scan.status === 'completed' ? 'text-emerald-500' :
                        scan.status === 'running' ? 'text-blue-500' :
                        scan.status === 'failed' ? 'text-red-500' : ''
                      }`}>
                        {scan.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{scan.pagesScanned} pages</span>
                      <span>{scan.violationsFound} violations</span>
                      <span>{formatRelativeTime(scan.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!scansData || scansData.length === 0) && (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scans yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// PROJECTS VIEW
// ============================================================================

const ProjectsView = () => {
  const { toast } = useToast();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const createScan = useCreateScan();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: '',
    url: '',
    description: ''
  });

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.url) {
      toast({ title: 'Error', description: 'Name and URL are required', variant: 'destructive' });
      return;
    }

    try {
      const result = await createProject.mutateAsync(newProject);
      toast({ 
        title: 'Project Created', 
        description: `"${newProject.name}" has been added and scanning has started.` 
      });
      setIsAddOpen(false);
      setNewProject({ name: '', url: '', description: '' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
    }
  };

  const handleScan = async (projectId: string, projectName: string) => {
    try {
      const result = await createScan.mutateAsync(projectId);
      toast({ 
        title: 'Scan Started', 
        description: `Scanning "${projectName}" for violations...` 
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start scan', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your monitored websites</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
              <DialogDescription>
                Enter the URL of the website you want to monitor for accessibility compliance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Website"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={newProject.url}
                  onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Scan Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-coral hover:bg-coral/90 text-coral-foreground" 
                onClick={handleCreateProject}
                disabled={createProject.isPending}
              >
                {createProject.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  'Create & Scan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card key={project.id} className="hover:border-coral/30 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {project.name}
                      {project.riskScore && project.riskScore < 50 && (
                        <Badge variant="outline" className="text-xs border-red-500/20 text-red-500">
                          High Risk
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Globe className="h-3 w-3" />
                      <a 
                        href={project.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-coral transition-colors"
                      >
                        {new URL(project.url).hostname}
                      </a>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleScan(project.id, project.name)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Scan Now
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <span className={`text-lg font-bold ${getRiskColor(project.riskScore || 0)}`}>
                      {project.riskScore ?? '—'}
                      {project.riskScore !== null && <span className="text-sm text-muted-foreground">/100</span>}
                    </span>
                  </div>
                  <Progress 
                    value={project.riskScore || 0} 
                    className="h-2"
                  />
                </div>

                {/* Violations Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <div className="text-lg font-bold text-red-500">{project.violations?.critical || 0}</div>
                    <div className="text-xs text-muted-foreground">Crit</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <div className="text-lg font-bold text-orange-500">{project.violations?.serious || 0}</div>
                    <div className="text-xs text-muted-foreground">Ser</div>
                  </div>
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <div className="text-lg font-bold text-yellow-500">{project.violations?.moderate || 0}</div>
                    <div className="text-xs text-muted-foreground">Mod</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <div className="text-lg font-bold text-blue-500">{project.violations?.minor || 0}</div>
                    <div className="text-xs text-muted-foreground">Min</div>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(project.lastScanAt || project.createdAt)}
                  </div>
                  {project.scans?.[0] && (
                    <Badge variant="outline" className={`text-xs ${
                      project.scans[0].status === 'completed' ? 'border-emerald-500/20 text-emerald-500' :
                      project.scans[0].status === 'running' ? 'border-blue-500/20 text-blue-500' :
                      project.scans[0].status === 'failed' ? 'border-red-500/20 text-red-500' : ''
                    }`}>
                      {project.scans[0].status}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleScan(project.id, project.name)}
                  disabled={createScan.isPending}
                >
                  {createScan.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" />Scan Now</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {(!projects || projects.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="py-16 text-center">
                <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">Add your first website to start monitoring for accessibility issues.</p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VIOLATIONS VIEW
// ============================================================================

const ViolationsView = () => {
  const { toast } = useToast();
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: violationsData, isLoading } = useViolations({
    severity: severityFilter as Severity | 'all',
    status: statusFilter as ViolationStatus | 'all',
    limit: 100
  });
  
  const { data: remediation, isLoading: remediationLoading } = useRemediation(selectedViolation?.id || null);
  const updateStatus = useUpdateViolationStatus();
  const generateRemediation = useGenerateRemediation();

  const filteredViolations = useMemo(() => {
    if (!Array.isArray(violationsData)) return [];
    if (!searchQuery) return violationsData;
    
    const query = searchQuery.toLowerCase();
    return violationsData.filter(v => 
      v.ruleId.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.url.toLowerCase().includes(query)
    );
  }, [violationsData, searchQuery]);

  const handleStatusUpdate = async (id: string, status: ViolationStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: 'Updated', description: `Violation marked as ${status}` });
      setSelectedViolation(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleGenerateFix = async (violationId: string) => {
    try {
      await generateRemediation.mutateAsync({ violationId, forceRegenerate: true });
      toast({ title: 'Fix Generated', description: 'AI remediation code has been generated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate fix', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Violations</h1>
          <p className="text-muted-foreground">Review and remediate accessibility issues</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
            <Github className="h-4 w-4 mr-2" />
            Create Fix PRs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search violations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="serious">Serious</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredViolations.length} violations
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Violations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredViolations.map((violation) => (
            <Card
              key={violation.id}
              className="hover:border-coral/30 transition-colors cursor-pointer group"
              onClick={() => setSelectedViolation(violation)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${SEVERITY_BG[violation.severity]}`}>
                    {violation.severity === 'critical' ? (
                      <AlertCircle className={`h-5 w-5 ${SEVERITY_TEXT[violation.severity]}`} />
                    ) : (
                      <AlertTriangle className={`h-5 w-5 ${SEVERITY_TEXT[violation.severity]}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">
                        {violation.ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getSeverityBadge(violation.severity)}`}>
                        {violation.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        WCAG {violation.wcagCriteria}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${getStatusBadge(violation.status)}`}>
                        {violation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span className="truncate max-w-md">{violation.url}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        <span className="truncate max-w-xs">{violation.elementSelector}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(violation.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {violation.aiConfidenceScore && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {Math.round(violation.aiConfidenceScore * 100)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>AI confidence score</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setSelectedViolation(violation); }}
                    >
                      View Fix
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredViolations.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                <h3 className="text-lg font-semibold mb-2">No violations found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search or filters.' : 'All accessibility issues have been resolved!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Violation Detail Modal */}
      <Dialog open={!!selectedViolation} onOpenChange={() => setSelectedViolation(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedViolation?.ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              <Badge variant="outline" className={`text-xs ${getSeverityBadge(selectedViolation?.severity || 'moderate')}`}>
                {selectedViolation?.severity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                WCAG {selectedViolation?.wcagCriteria}
              </Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Globe className="h-3 w-3" />
              <a 
                href={selectedViolation?.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-coral transition-colors"
              >
                {selectedViolation?.url}
              </a>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{selectedViolation?.description}</p>
            </div>

            {selectedViolation?.elementSelector && (
              <div>
                <h4 className="text-sm font-medium mb-2">Element Selector</h4>
                <code className="block p-3 bg-muted rounded-lg text-sm font-mono">
                  {selectedViolation.elementSelector}
                </code>
              </div>
            )}

            {selectedViolation?.elementHtml && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Current Code
                </h4>
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto text-red-400/80">
                  <code>{selectedViolation.elementHtml}</code>
                </pre>
              </div>
            )}

            {(selectedViolation?.remediationCode || remediation?.remediationCode) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-coral" />
                    AI-Suggested Fix
                  </h4>
                  {remediation?.confidence && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(remediation.confidence * 100)}% confidence
                    </Badge>
                  )}
                </div>
                {remediationLoading ? (
                  <div className="flex items-center justify-center py-8 bg-muted rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <pre className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm font-mono overflow-x-auto text-emerald-500/90">
                    <code>{remediation?.remediationCode || selectedViolation?.remediationCode}</code>
                  </pre>
                )}
                {(remediation?.explanation || selectedViolation?.aiExplanation) && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Explanation:</strong> {remediation?.explanation || selectedViolation?.aiExplanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
            <div className="flex gap-2 flex-1">
              <Button 
                variant="outline" 
                onClick={() => selectedViolation && handleStatusUpdate(selectedViolation.id, 'ignored')}
                disabled={updateStatus.isPending}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Ignore
              </Button>
              <Button 
                variant="outline" 
                onClick={() => selectedViolation && handleStatusUpdate(selectedViolation.id, 'false_positive')}
                disabled={updateStatus.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                False Positive
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                onClick={() => selectedViolation && handleStatusUpdate(selectedViolation.id, 'fixed')}
                disabled={updateStatus.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Fixed
              </Button>
              <Button
                className="bg-coral hover:bg-coral/90 text-coral-foreground"
                onClick={() => selectedViolation && handleGenerateFix(selectedViolation.id)}
                disabled={generateRemediation.isPending}
              >
                {generateRemediation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate Fix</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// SCANS VIEW
// ============================================================================

const ScansView = () => {
  const { data: scans, isLoading } = useScans(undefined, 50);
  const { data: projects } = useProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scan History</h1>
          <p className="text-muted-foreground">View all accessibility scan history</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {scans?.map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`p-2.5 rounded-lg ${
                    scan.status === 'completed' ? 'bg-emerald-500/10' :
                    scan.status === 'running' ? 'bg-blue-500/10' :
                    scan.status === 'failed' ? 'bg-red-500/10' : 'bg-gray-500/10'
                  }`}>
                    {scan.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : scan.status === 'running' ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : scan.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{scan.project?.name || 'Unknown Project'}</span>
                      <Badge variant="outline" className={`text-xs ${
                        scan.status === 'completed' ? 'border-emerald-500/20 text-emerald-500' :
                        scan.status === 'running' ? 'border-blue-500/20 text-blue-500' :
                        scan.status === 'failed' ? 'border-red-500/20 text-red-500' : ''
                      }`}>
                        {scan.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{scan.pagesScanned} pages scanned</span>
                      <span>{scan.violationsFound} violations found</span>
                      <span>{formatRelativeTime(scan.createdAt)}</span>
                    </div>
                  </div>
                  {scan.status === 'completed' && scan.summary && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const summary = JSON.parse(scan.summary);
                        return (
                          <>
                            {summary.critical > 0 && (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                {summary.critical} critical
                              </Badge>
                            )}
                            {summary.serious > 0 && (
                              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                {summary.serious} serious
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!scans || scans.length === 0) && (
                <div className="py-16 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scans yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// REPORTS VIEW
// ============================================================================

const ReportsView = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate compliance reports</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:border-coral/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-coral/10">
                <FileText className="h-6 w-6 text-coral" />
              </div>
              <div>
                <CardTitle className="text-lg">Legal Shield™ Report</CardTitle>
                <CardDescription>Timestamped audit for legal defense</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a comprehensive PDF report documenting your accessibility compliance efforts. 
              Includes timestamps, violation history, and remediation records.
            </p>
            <Button className="w-full bg-coral hover:bg-coral/90 text-coral-foreground">
              <Download className="h-4 w-4 mr-2" />
              Generate PDF Report
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <BarChart3 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
                <CardDescription>High-level compliance overview</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              A summary report perfect for stakeholders. Includes risk scores, trend analysis, 
              and actionable recommendations.
            </p>
            <Button variant="outline" className="w-full border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
              <Download className="h-4 w-4 mr-2" />
              Generate Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS VIEW
// ============================================================================

const SettingsView = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input defaultValue="Demo User" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input defaultValue="demo@accessguard.io" />
              </div>
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Manage your organization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Organization Name</Label>
                <Input defaultValue="Demo Organization" />
              </div>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-coral/10">
                    <Building2 className="h-5 w-5 text-coral" />
                  </div>
                  <div>
                    <p className="font-medium">Agency Plan</p>
                    <p className="text-sm text-muted-foreground">$199/month • 10 websites</p>
                  </div>
                </div>
                <Button variant="outline">Upgrade</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Critical violations detected', description: 'Get notified when critical issues are found', defaultChecked: true },
                { label: 'Weekly digest', description: 'Receive a weekly summary of your compliance status', defaultChecked: true },
                { label: 'Scan completed', description: 'Get notified when a scan finishes', defaultChecked: false },
                { label: 'New features', description: 'Learn about new AccessGuard features', defaultChecked: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked={item.defaultChecked} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium">Agency Plan</p>
                  <p className="text-sm text-muted-foreground">$199/month • Billed monthly</p>
                </div>
                <Badge className="bg-emerald-500 text-white">Active</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Websites</p>
                  <p className="text-2xl font-bold">3 <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Pages Scanned</p>
                  <p className="text-2xl font-bold">847 <span className="text-sm font-normal text-muted-foreground">/ 1,000</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Cancel Subscription</Button>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">Upgrade Plan</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Production Key</p>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <code className="text-sm text-muted-foreground font-mono">
                  ag_live_••••••••••••••••••••••••
                </code>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Regenerate Key</Button>
                <Button variant="outline">
                  <Terminal className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>Connect to GitHub for automated PRs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-8 w-8" />
                  <div>
                    <p className="font-medium">Connected to GitHub</p>
                    <p className="text-sm text-muted-foreground">3 repositories linked</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Repository
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function AccessGuardApp() {
  const [view, setView] = useState<View>('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeView={view} setActiveView={setView} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar
            activeView={view}
            setActiveView={setView}
            isMobile
            onClose={() => setIsSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <DashboardView />}
              {view === 'projects' && <ProjectsView />}
              {view === 'violations' && <ViolationsView />}
              {view === 'scans' && <ScansView />}
              {view === 'reports' && <ReportsView />}
              {view === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-4 px-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-coral" />
              <span>AccessGuard © 2024</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Lawsuit Defense Ready™
            </Badge>
          </div>
        </footer>
      </div>
      
      <Toaster />
    </div>
  );
}
