import { useQuery } from '@tanstack/react-query'
import { getProviderModels, type GetProviderModelsOptions, type ProviderModelsResponse } from '../api/client'

export function useProviderModels(provider: string, opts?: GetProviderModelsOptions) {
  return useQuery<ProviderModelsResponse>({
    queryKey: ['providers', provider, 'models'],
    queryFn: () => getProviderModels(provider, opts),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: Boolean(provider),
  })
}
