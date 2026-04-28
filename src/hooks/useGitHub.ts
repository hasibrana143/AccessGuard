// React Query hooks for GitHub integration
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const githubKeys = {
  status: ['github', 'status'] as const,
  repos: ['github', 'repos'] as const,
};

// Get GitHub connection status
export function useGitHubStatus(enabled = true) {
  return useQuery({
    queryKey: githubKeys.status,
    queryFn: async () => {
      const res = await fetch('/api/github/status');
      const data = await res.json();
      return data.data;
    },
    enabled,
  });
}

// Get repositories
export function useGitHubRepositories(enabled = true) {
  return useQuery({
    queryKey: githubKeys.repos,
    queryFn: async () => {
      const res = await fetch('/api/github/repositories');
      const data = await res.json();
      return data.data || [];
    },
    enabled,
  });
}

// Disconnect GitHub
export function useDisconnectGitHub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // In demo mode, just invalidate
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: githubKeys.status });
    },
  });
}
