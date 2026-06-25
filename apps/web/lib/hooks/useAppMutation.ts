import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
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

export type AppMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = UseMutationOptions<TData, TError, TVariables, TContext> & {
  successMessage?: MessageResolver<TData, TVariables>;
  errorMessage?: string | ((error: TError, variables: TVariables) => string);
  invalidateNotifications?: boolean;
};

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
    onSuccess,
    onError,
    ...rest
  } = options;

  return useMutation({
    ...rest,
    onSuccess: async (data, variables, onMutateResult, context) => {
      const message = resolveMessage(successMessage, data, variables);
      if (message) toast.success(message);

      if (invalidateNotifications) {
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      await onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      const resolved =
        typeof errorMessage === "function"
          ? errorMessage(error, variables)
          : errorMessage ?? formatApiError(error);
      toast.error(resolved);
      onError?.(error, variables, onMutateResult, context);
    },
  });
}
