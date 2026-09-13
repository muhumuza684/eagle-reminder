export type GuestUser = {
  name?: string | null;
  email?: string | null;
};

export function useAuth(): {
  user: GuestUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
} {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    logout: async () => {},
  };
}
