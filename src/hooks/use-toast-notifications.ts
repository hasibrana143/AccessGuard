import { useToast } from '@/hooks/use-toast';

// Predefined toast notifications for common actions
export function useNotifications() {
  const { toast } = useToast();

  return {
    // Success notifications
    success: {
      saved: () => toast({ title: 'Saved', description: 'Your changes have been saved.' }),
      created: (item: string) => toast({ title: 'Created', description: `${item} has been created.` }),
      updated: (item: string) => toast({ title: 'Updated', description: `${item} has been updated.` }),
      deleted: (item: string) => toast({ title: 'Deleted', description: `${item} has been deleted.` }),
      copied: () => toast({ title: 'Copied', description: 'Copied to clipboard.' }),
      signedIn: () => toast({ title: 'Welcome back!', description: 'You have successfully signed in.' }),
      signedOut: () => toast({ title: 'Signed out', description: 'You have been signed out.' }),
      scanStarted: () => toast({ title: 'Scan Started', description: 'The scan is now running.' }),
      scanCompleted: (violations: number) =>
        toast({
          title: 'Scan Completed',
          description: `Found ${violations} accessibility ${violations === 1 ? 'issue' : 'issues'}.`,
        }),
      remediationGenerated: () =>
        toast({ title: 'Fix Generated', description: 'AI has generated a fix for this violation.' }),
    },

    // Error notifications
    error: {
      generic: () =>
        toast({
          title: 'Error',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        }),
      validation: (message: string) =>
        toast({ title: 'Validation Error', description: message, variant: 'destructive' }),
      notFound: (item: string) =>
        toast({ title: 'Not Found', description: `${item} was not found.`, variant: 'destructive' }),
      unauthorized: () =>
        toast({
          title: 'Unauthorized',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        }),
      network: () =>
        toast({
          title: 'Network Error',
          description: 'Please check your internet connection.',
          variant: 'destructive',
        }),
      signIn: () =>
        toast({
          title: 'Sign In Failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
        }),
      rateLimit: () =>
        toast({
          title: 'Too Many Requests',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive',
        }),
    },

    // Warning notifications
    warning: {
      unsavedChanges: () =>
        toast({
          title: 'Unsaved Changes',
          description: 'You have unsaved changes. Are you sure you want to leave?',
        }),
      confirmDelete: (item: string) =>
        toast({
          title: 'Confirm Delete',
          description: `Are you sure you want to delete this ${item}? This action cannot be undone.`,
        }),
    },

    // Info notifications
    info: {
      loading: () => toast({ title: 'Loading...', description: 'Please wait.' }),
      processing: () => toast({ title: 'Processing...', description: 'This may take a moment.' }),
    },
  };
}
