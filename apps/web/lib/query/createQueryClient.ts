import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";

function queryErrorLabel(meta: Record<string, unknown> | undefined): string {
  const label = meta?.errorLabel;
  return typeof label === "string" && label.trim() ? label : "Could not load data";
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.suppressErrorToast) return;
        if (query.meta?.toastOnError === false) return;
        const label = queryErrorLabel(query.meta);
        toast.error(`${label}: ${formatApiError(error)}`);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.suppressErrorToast) return;
        const label = mutation.meta?.errorLabel;
        const prefix =
          typeof label === "string" && label.trim() ? `${label}: ` : "";
        toast.error(`${prefix}${formatApiError(error)}`);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        meta: {
          suppressErrorToast: true,
        },
      },
      mutations: {
        meta: {
          suppressErrorToast: true,
        },
      },
    },
  });
}
