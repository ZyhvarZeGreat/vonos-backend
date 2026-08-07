import { useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  createOptimisticHandlers,
  type OptimisticConfig,
  type OptimisticMutationContext,
} from "@/lib/query/optimistic";
import { formatApiError } from "@/lib/utils/formatApiError";
import {
  newIdempotencyKey,
  withIdempotencyKey,
} from "@/lib/utils/idempotency";
import { isTransientWriteError } from "@/lib/utils/withWriteRetries";
import { useDatabaseConnected } from "@/lib/hooks/useApiHealth";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMutationFn = (...args: any[]) => Promise<any>;

type InferVariables<TFn> = TFn extends (...args: infer A) => unknown
  ? A extends []
    ? void
    : A[0]
  : void;

type InferData<TFn> = TFn extends (...args: never[]) => Promise<infer TData>
  ? TData
  : unknown;

export type AppMutationOptions<
  TFn extends AnyMutationFn,
  TError = Error,
  TContext = unknown,
> = Omit<
  UseMutationOptions<
    InferData<TFn>,
    TError,
    InferVariables<TFn>,
    AppMutationContext<TContext>
  >,
  "mutationFn"
> & {
  mutationFn: TFn;
  successMessage?: MessageResolver<InferData<TFn>, InferVariables<TFn>>;
  errorMessage?:
    | string
    | ((error: TError, variables: InferVariables<TFn>) => string);
  /** Shown on the global 0–100% write progress chip (default: "Saving"). Pass `false` to skip the chip. */
  progressLabel?: string | false;
  invalidateNotifications?: boolean;
  /**
   * Optimistic cache updates: snapshot → update → rollback on error →
   * invalidate on settle. Prefer this over manual invalidateQueries in onSuccess.
   */
  optimistic?: OptimisticConfig<InferVariables<TFn>, InferData<TFn>>;
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

/**
 * App mutation wrapper. Variables + data are inferred from `mutationFn`
 * (first param / Promise return) so `mutate(arg)` stays type-safe.
 */
export function useAppMutation<
  TFn extends AnyMutationFn,
  TError = Error,
  TContext = unknown,
>(
  options: AppMutationOptions<TFn, TError, TContext>,
): UseMutationResult<
  InferData<TFn>,
  TError,
  InferVariables<TFn>,
  AppMutationContext<TContext>
> {
  type TData = InferData<TFn>;
  type TVariables = InferVariables<TFn>;

  const queryClient = useQueryClient();
  const databaseConnected = useDatabaseConnected();
  const {
    successMessage,
    errorMessage,
    progressLabel,
    invalidateNotifications = true,
    optimistic,
    invalidateKeys,
    mutationFn: userMutationFn,
    onSuccess,
    onError,
    onMutate,
    onSettled,
    ...rest
  } = options;

  const optimisticConfig = mergeOptimisticConfig<TVariables, TData>(
    optimistic,
    invalidateKeys,
  );
  const optimisticHandlers = optimisticConfig
    ? createOptimisticHandlers<TData, TVariables>(queryClient, optimisticConfig)
    : null;
  /** Stable across React Query retries for this mutate() attempt. */
  const idempotencyKeyRef = useRef<string | null>(null);

  return useMutation<TData, TError, TVariables, AppMutationContext<TContext>>({
    ...rest,
    // Default: a couple background retries on Neon/network blips.
    retry:
      rest.retry ??
      ((failureCount, error) =>
        failureCount < 2 && isTransientWriteError(error)),
    meta: {
      suppressErrorToast: true,
      ...(progressLabel === false
        ? { suppressWriteProgress: true }
        : { progressLabel: progressLabel ?? "Saving" }),
      ...rest.meta,
    },
    mutationFn: async (variables, context) => {
      if (!databaseConnected) {
        throw new Error(
          "Database is disconnected. Saves are paused until the API recovers.",
        );
      }
      const key = idempotencyKeyRef.current ?? newIdempotencyKey();
      idempotencyKeyRef.current = key;
      return withIdempotencyKey(key, () =>
        // RQ may pass MutationFunctionContext as 2nd arg; callers often ignore it.
        (userMutationFn as (v: TVariables, c?: unknown) => Promise<TData>)(
          variables,
          context,
        ),
      );
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
    onSuccess: (data, variables, onMutateResult, context) => {
      optimisticHandlers?.onSuccess(data, variables);

      const message = resolveMessage(successMessage, data, variables);
      if (message) toast.success(message);

      if (invalidateNotifications) {
        // Background — don't hold isPending / Saving on notification refresh.
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      // Never await caller onSuccess — invalidation / navigation must not
      // keep MutationCache busy (Saving chip / isPending) after the write returns.
      void Promise.resolve(
        onSuccess?.(data, variables, onMutateResult, context),
      ).catch(() => {
        /* caller handles its own errors */
      });
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
    onSettled: (data, error, variables, onMutateResult, context) => {
      idempotencyKeyRef.current = null;
      // Fire-and-forget: list invalidation must not delay UI unlock.
      void optimisticHandlers?.onSettled();
      void onSettled?.(data, error, variables, onMutateResult, context);
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
