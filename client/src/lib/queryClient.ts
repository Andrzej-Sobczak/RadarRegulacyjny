import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest({
  url,
  method = 'GET',
  headers = {},
  body = undefined,
}: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 2000, // Odświeżanie co 2 sekundy
      refetchOnWindowFocus: true, // Odświeżanie przy zmianie fokusa okna
      staleTime: 500, // Dane stają się stare po 0.5 sekundy
      retry: 3, // Konkretna liczba prób
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff z limitem 30 sekund
      refetchOnMount: true, // Zawsze odświeżaj przy montowaniu komponentu
    },
    mutations: {
      retry: 2, // Włączamy ponowne próby dla mutacji (2 razy)
      retryDelay: 1000, // 1 sekunda między próbami dla mutacji
    },
  },
});
