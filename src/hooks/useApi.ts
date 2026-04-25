import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AgentStatus } from '../api/client'

export function useStatus() {
  return useQuery<AgentStatus>({
    queryKey: ['status'],
    queryFn: api.status,
    refetchInterval: 30_000,
  })
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: api.metrics,
    refetchInterval: 30_000,
  })
}

export function useConversations(params?: { limit?: number; offset?: number; channel?: string }) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: () => api.conversations(params),
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.conversation(id),
    enabled: !!id,
  })
}

export function useMemory(q: string) {
  return useQuery({
    queryKey: ['memory', q],
    queryFn: () => api.memory(q),
  })
}

export function useMetricsHistory(days = 30) {
  return useQuery({
    queryKey: ['metrics-history', days],
    queryFn: () => api.metricsHistory(days),
    staleTime: 5 * 60_000, // 5 min — historical data doesn't change often
  })
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: api.systemMetrics,
    refetchInterval: 5_000, // process/host stats are live — refresh fast
    staleTime: 0,
  })
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: api.config,
    staleTime: 60_000,
  })
}
