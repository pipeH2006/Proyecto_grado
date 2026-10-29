export type ActionError = {
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type ActionResult<T> = {
  data: T | null;
  error: ActionError | null;
};
