import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * wrapper سبک روی useQuery با کلید و queryFn — برای استانداردسازی
 * بارگذاری لیست‌ها از سرویس‌های Supabase.
 */
export function useSupabaseList<T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: key,
    queryFn: fetcher,
    ...options,
  });
}
