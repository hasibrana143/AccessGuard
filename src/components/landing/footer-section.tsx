'use client';

import { Shield, Github, ExternalLink, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const productLinks = ['Features', 'Pricing', 'Documentation', 'API Reference', 'Changelog'];
const companyLinks = ['About', 'Blog', 'Careers', 'Contact', 'Press Kit'];
const legalLinks = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'SOC 2'];

export function FooterSection() {
  return (
    <footer className="border-t border-border py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-coral" />
              <span className="text-xl font-bold">AccessGuard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Making the web accessible, one fix at a time.
            </p>
            <div className="flex gap-3">
              <a href="#" aria-label="GitHub"><Github aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
              <a href="#" aria-label="Twitter"><ExternalLink aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
              <a href="#" aria-label="LinkedIn"><MessageSquare aria-hidden="true" className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-xs">SOC 2 Compliant</Badge>
            <Badge variant="outline" className="border-blue-500/20 text-blue-500 text-xs">GDPR Ready</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AccessGuard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
