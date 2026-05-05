export type ApiResponse<T = unknown> = {
  data: T | null;
  message: string;
  error: string;
  success: boolean;
};
