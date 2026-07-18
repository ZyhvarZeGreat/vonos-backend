import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";
import { useMutationBusyStore } from "@/stores/mutationBusyStore";

function queryErrorLabel(meta: Record<string, unknown> | undefined): string {
  const label = meta?.errorLabel;
  return typeof label === "string" && label.trim() ? label : "Could not load data";
}

function mutationErrorLabel(meta: Record<string, unknown> | undefined): string {
  const label = meta?.errorLabel;
  return typeof label === "string" && label.trim() ? label : "Action failed";
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
      onMutate: () => {
        useMutationBusyStore.getState().begin();
      },
      onSettled: () => {
        useMutationBusyStore.getState().end();
      },
      onError: (error, _variables, _context, mutation) => {
        // useAppMutation toasts its own message — skip duplicate.
        if (mutation.meta?.suppressErrorToast) return;
        const label = mutationErrorLabel(mutation.meta);
        toast.error(`${label}: ${formatApiError(error)}`);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
        meta: {
          suppressErrorToast: true,
        },
      },
      mutations: {
        // Raw useMutation gets a toast via MutationCache; useAppMutation opts out.
        meta: {
          suppressErrorToast: false,
        },
      },
    },
  });
}
