import { toast } from "sonner";

export const notify = {
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
  info: (message) => toast(message),
  loading: (message) => toast.loading(message),
  promise: (promise, messages) => {
    toast.promise(promise, messages);
    return promise;
  },
};
