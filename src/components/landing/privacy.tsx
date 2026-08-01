'use client';

import { Shield, Lock, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Privacy() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-coral/20 text-coral px-3 py-1 mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Enterprise Ready
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your Code, Your Data, Your Control</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built for security-conscious organizations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mb-3">
                <Lock aria-hidden="true" className="h-6 w-6 text-emerald-500" />
              </div>
              <CardTitle>Data Encryption</CardTitle>
              <CardDescription>
                All data encrypted at rest (AES-256) and in transit (TLS 1.3)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your source code and scan results are encrypted using industry-standard algorithms.
                We never share your data with third parties.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-xl bg-coral/10 w-fit mb-3">
                <Shield aria-hidden="true" className="h-6 w-6 text-coral" />
              </div>
              <CardTitle>SOC 2 Certified</CardTitle>
              <CardDescription>
                We undergo regular third-party security audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AccessGuard maintains SOC 2 Type II certification, ensuring our security controls
                meet the highest industry standards.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-xl bg-blue-500/10 w-fit mb-3">
                <Users aria-hidden="true" className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>GDPR Compliant</CardTitle>
              <CardDescription>
                Full compliance with European data protection regulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We provide data processing agreements, data deletion APIs, and comply with
                GDPR requirements for data portability and right to erasure.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
