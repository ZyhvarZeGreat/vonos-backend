import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  createOptimisticHandlers,
  type OptimisticConfig,
  type OptimisticMutationContext,
} from "@/lib/query/optimistic";
import { formatApiError } from "@/lib/utils/formatApiError";
import { toast } from "@/stores/toastStore";

type MessageResolver<TData, TVariables> =
  | string
  | ((data: TData, variables: TVariables) => string);

function resolveMessage<TData, TVariables>(
  message: MessageResolver<TData, TVariables> | undefined,
  data: TData,
  variables: TVariables,
): string | undefined {
  if (!message) return undefined;
  return typeof message === "function" ? message(data, variables) : message;
}

type AppMutationContext<TContext> = TContext & {
  __optimistic?: OptimisticMutationContext;
};

export type AppMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, AppMutationContext<TContext>>,
  "mutationFn"
> & {
  mutationFn: UseMutationOptions<
    TData,
    TError,
    TVariables,
    AppMutationContext<TContext>
  >["mutationFn"];
  successMessage?: MessageResolver<TData, TVariables>;
  errorMessage?: string | ((error: TError, variables: TVariables) => string);
  invalidateNotifications?: boolean;
  /**
   * Optimistic cache updates: snapshot → update → rollback on error →
   * invalidate on settle. Prefer this over manual invalidateQueries in onSuccess.
   */
  optimistic?: OptimisticConfig<TVariables, TData>;
  /** Shorthand for `optimistic: { keys }` when no custom updater is needed. */
  invalidateKeys?: readonly QueryKey[];
};

function mergeOptimisticConfig<TVariables, TData>(
  optimistic: OptimisticConfig<TVariables, TData> | undefined,
  invalidateKeys: readonly QueryKey[] | undefined,
): OptimisticConfig<TVariables, TData> | undefined {
  if (optimistic) return optimistic;
  if (invalidateKeys?.length) return { keys: invalidateKeys };
  return undefined;
}

export function useAppMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(options: AppMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient();
  const {
    successMessage,
    errorMessage,
    invalidateNotifications = true,
    optimistic,
    invalidateKeys,
    onSuccess,
    onError,
    onMutate,
    onSettled,
    ...rest
  } = options;

  const optimisticConfig = mergeOptimisticConfig(optimistic, invalidateKeys);
  const optimisticHandlers = optimisticConfig
    ? createOptimisticHandlers<TData, TVariables>(queryClient, optimisticConfig)
    : null;

  return useMutation({
    ...rest,
    meta: {
      suppressErrorToast: true,
      ...rest.meta,
    },
    onMutate: async (variables, context) => {
      const userCtx = (await onMutate?.(variables, context)) as
        | TContext
        | undefined;
      const optimisticCtx = optimisticHandlers
        ? await optimisticHandlers.onMutate(variables)
        : undefined;
      return {
        ...(userCtx as object),
        __optimistic: optimisticCtx,
      } as AppMutationContext<TContext>;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      optimisticHandlers?.onSuccess(data, variables);

      const message = resolveMessage(successMessage, data, variables);
      if (message) toast.success(message);

      if (invalidateNotifications) {
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      await onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      optimisticHandlers?.onError(
        error,
        variables,
        onMutateResult?.__optimistic,
      );

      const resolved =
        typeof errorMessage === "function"
          ? errorMessage(error, variables)
          : errorMessage ?? formatApiError(error);
      toast.error(resolved);
      onError?.(error, variables, onMutateResult, context);
    },
    onSettled: async (data, error, variables, onMutateResult, context) => {
      await optimisticHandlers?.onSettled();
      await onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
}

/** Helper for screens still on raw useMutation. */
export function withOptimistic<TData, TVariables>(
  queryClient: QueryClient,
  config: OptimisticConfig<TVariables, TData>,
) {
  return createOptimisticHandlers(queryClient, config);
}
