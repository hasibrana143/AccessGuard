'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle2, Download, Github, Search, Globe, Code, Clock,
  Sparkles, EyeOff, XCircle, Check, Loader2, CheckSquare, Square, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useViolations, useRemediation, useUpdateViolationStatus, useGenerateRemediation, useBulkUpdateViolations } from '@/hooks/useApi';
import { getSeverityBadge, getStatusBadge, formatRelativeTime, SEVERITY_BG, SEVERITY_TEXT } from '@/lib/constants';
import type { Violation, Severity, ViolationStatus } from '@/types';

export default function ViolationsPage() {
  const { toast } = useToast();
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('severity-desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [repos, setRepos] = useState<{ fullName: string; name: string; description?: string | null; private?: boolean }[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prResult, setPrResult] = useState<{ prUrl?: string; message?: string; demoMode?: boolean; violationsCount?: number; project?: { name: string } } | null>(null);

  const bulkUpdate = useBulkUpdateViolations();

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

    let list = violationsData;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(v =>
        v.ruleId.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.url.toLowerCase().includes(query)
      );
    }

    const severityRank = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    switch (sortBy) {
      case 'severity-asc':
        list = [...list].sort((a, b) => (severityRank[b.severity] ?? 9) - (severityRank[a.severity] ?? 9));
        break;
      case 'severity-desc':
        list = [...list].sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));
        break;
      case 'date-new':
        list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'date-old':
        list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'rule':
        list = [...list].sort((a, b) => a.ruleId.localeCompare(b.ruleId));
        break;
      default:
        list = [...list].sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));
    }
    return list;
  }, [violationsData, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / PAGE_SIZE));
  const pagedViolations = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return filteredViolations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filteredViolations, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [severityFilter, statusFilter, searchQuery, sortBy]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredViolations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredViolations.map(v => v.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: ViolationStatus) => {
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdate.mutateAsync({ ids, status });
      toast({ title: 'Updated', description: `${ids.length} violations marked as ${status}` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: 'Error', description: 'Failed to bulk update violations', variant: 'destructive' });
    }
  };

  const openPrDialog = async () => {
    setPrDialogOpen(true);
    setPrResult(null);
    setSelectedRepo('');
    setReposLoading(true);
    try {
      const res = await fetch('/api/github/repos');
      const data = await res.json();
      if (data.success) {
        setRepos(data.data || []);
        setDemoMode(!!data.demoMode);
        if (data.data?.length > 0 && data.demoMode) {
          setSelectedRepo(data.data[0].fullName);
        }
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch repositories', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch repositories', variant: 'destructive' });
    } finally {
      setReposLoading(false);
    }
  };

  const handleCreatePr = async () => {
    if (prSubmitting) return;
    const ids = selectedIds.size > 0
      ? Array.from(selectedIds)
      : filteredViolations.filter(v => v.remediationCode).map(v => v.id);
    if (ids.length === 0) {
      toast({ title: 'No fixes available', description: 'Select violations or generate AI fixes first', variant: 'destructive' });
      return;
    }
    setPrSubmitting(true);
    setPrResult(null);
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violationIds: ids, repository: selectedRepo || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to create PR', variant: 'destructive' });
      } else {
        const info = data.data || {};
        setPrResult({
          prUrl: info.prUrl,
          message: info.message || 'Pull request created successfully',
          demoMode: data.demoMode || false,
          violationsCount: info.violationsCount || ids.length,
          project: info.project,
        });
        toast({
          title: data.demoMode ? 'Preview Generated' : 'PR Created',
          description: data.demoMode ? 'Demo preview ready (GitHub not connected)' : 'Pull request created successfully',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create PR', variant: 'destructive' });
    } finally {
      setPrSubmitting(false);
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
          <Button variant="outline" onClick={() => {
            const params = new URLSearchParams();
            if (severityFilter !== 'all') params.append('severity', severityFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            window.open(`/api/violations/export?${params}`, '_blank');
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={openPrDialog}>
            <Github className="h-4 w-4 mr-2" />
            Create Fix PRs
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Label htmlFor="violations-search" className="sr-only">Search violations</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="violations-search"
                placeholder="Search violations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by severity">
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
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="severity-desc">Severity: High to Low</SelectItem>
                <SelectItem value="severity-asc">Severity: Low to High</SelectItem>
                <SelectItem value="date-new">Newest first</SelectItem>
                <SelectItem value="date-old">Oldest first</SelectItem>
                <SelectItem value="rule">Rule ID (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="px-3 py-1">
              {filteredViolations.length} violations
            </Badge>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <Card className="border-coral/30 bg-coral/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-coral" />
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('fixed')}
                  disabled={bulkUpdate.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Fixed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('ignored')}
                  disabled={bulkUpdate.isPending}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Ignore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('false_positive')}
                  disabled={bulkUpdate.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  False Positive
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredViolations.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedIds.size === filteredViolations.length ? (
                  <CheckSquare className="h-3.5 w-3.5" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
                Select All
              </button>
            </div>
          )}
          {pagedViolations.map((violation) => (
            <Card
              key={violation.id}
              className={`hover:border-coral/30 transition-colors cursor-pointer group ${selectedIds.has(violation.id) ? 'ring-1 ring-coral/40 border-coral/30' : ''}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 pt-1"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(violation.id); }}
                  >
                    {selectedIds.has(violation.id) ? (
                      <CheckSquare className="h-5 w-5 text-coral cursor-pointer" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground cursor-pointer" />
                    )}
                  </div>
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
                    {violation.githubPrUrl && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-coral hover:text-coral"
                              onClick={(e) => { e.stopPropagation(); window.open(violation.githubPrUrl!, '_blank', 'noopener,noreferrer'); }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View pull request</TooltipContent>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {Math.min(page, totalPages)} of {totalPages} ({filteredViolations.length} violations)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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

      <Dialog open={prDialogOpen} onOpenChange={setPrDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5 text-coral" />
              Create Fix PRs
            </DialogTitle>
            <DialogDescription>
              Generate a pull request with AI-suggested accessibility fixes for{' '}
              <strong>{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filteredViolations.filter(v => v.remediationCode).length} violations with fixes`}</strong>.
              {selectedIds.size === 0 && filteredViolations.filter(v => v.remediationCode).length === 0 && (
                <span className="block mt-1 text-red-500">No violations with generated fixes found. Generate fixes first.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reposLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {demoMode && (
                  <div className="p-3 rounded-lg border border-coral/20 bg-coral/5 text-sm text-muted-foreground">
                    GitHub is not connected — a demo preview will be generated instead of a real PR.
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="pr-repo">Repository</Label>
                  {repos.length > 0 ? (
                    <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                      <SelectTrigger id="pr-repo">
                        <SelectValue placeholder={demoMode ? 'Select a repository' : 'Select a repository'} />
                      </SelectTrigger>
                      <SelectContent>
                        {repos.map((repo) => (
                          <SelectItem key={repo.fullName} value={repo.fullName}>
                            {repo.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">No repositories found.</p>
                  )}
                </div>

                {prResult && (
                  <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      {prResult.demoMode ? (
                        <CheckCircle2 className="h-4 w-4 text-coral" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="text-sm font-medium">
                        {prResult.demoMode ? 'Preview Generated' : 'Pull Request Created'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{prResult.message}</p>
                    {prResult.violationsCount != null && (
                      <p className="text-xs text-muted-foreground">
                        {prResult.violationsCount} fix file(s){prResult.project ? ` for ${prResult.project.name}` : ''}
                      </p>
                    )}
                    {prResult.prUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-coral border-coral/30 hover:bg-coral/10"
                        onClick={() => window.open(prResult.prUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View PR on GitHub
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrDialogOpen(false)} disabled={prSubmitting}>
              Close
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={handleCreatePr}
              disabled={prSubmitting || (repos.length > 0 && !selectedRepo)}
            >
              {prSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <><Github className="h-4 w-4 mr-2" />Create PR</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
