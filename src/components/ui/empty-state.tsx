'use client';

import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Optional illustration element for richer empty states */
  illustration?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        {illustration || (
          <div className="mb-4 rounded-full bg-muted p-4">
            <Icon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
        <div className="flex gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="bg-coral hover:bg-coral/90 text-coral-foreground">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
