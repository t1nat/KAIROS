import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

/* ────────────── Global mocks ────────────── */

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  redirect: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, priority, ...rest } = props;
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
  signOut: vi.fn(),
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
    resolvedTheme: "dark",
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock tRPC
vi.mock("~/trpc/react", () => {
  const createMockQuery = (data: unknown = null) => ({
    useQuery: () => ({
      data,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useMutation: (opts?: {
      onMutate?: (vars: unknown) => void;
      onSuccess?: (data: unknown) => void;
      onError?: (error: unknown) => void;
    }) => ({
      mutate: vi.fn((vars: unknown) => {
        opts?.onMutate?.(vars);
      }),
      mutateAsync: vi.fn(async (vars: unknown) => {
        opts?.onMutate?.(vars);
        return {};
      }),
      isPending: false,
      isError: false,
      error: null,
    }),
  });

  return {
    api: new Proxy(
      {},
      {
        get: () =>
          new Proxy(
            {},
            {
              get: () => createMockQuery(),
            },
          ),
      },
    ),
  };
});

// Mock uploadthing
vi.mock("~/lib/uploadthing", () => ({
  useUploadThing: () => ({
    startUpload: vi.fn(),
    isUploading: false,
  }),
}));

// Mock ToastProvider
vi.mock("~/components/providers/ToastProvider", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock GSAP
const gsapMock = {
  registerPlugin: vi.fn(),
  fromTo: vi.fn().mockReturnValue({}),
  to: vi.fn().mockReturnValue({}),
  from: vi.fn().mockReturnValue({}),
  set: vi.fn().mockReturnValue({}),
  timeline: () => ({
    fromTo: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    kill: vi.fn(),
  }),
  context: (fn: () => void) => {
    try { fn(); } catch { /* ignore errors in gsap context */ }
    return { revert: vi.fn(), add: vi.fn() };
  },
  matchMedia: () => ({
    add: vi.fn(),
    revert: vi.fn(),
  }),
};
vi.mock("gsap", () => ({
  default: gsapMock,
  gsap: gsapMock,
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    create: vi.fn(),
    refresh: vi.fn(),
    getAll: () => [],
    kill: vi.fn(),
  },
  default: {
    create: vi.fn(),
    refresh: vi.fn(),
    getAll: () => [],
    kill: vi.fn(),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// Polyfill setPointerCapture / releasePointerCapture for jsdom
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// CSS variables used by design tokens
document.documentElement.style.setProperty("--accent-primary", "139 92 246");
document.documentElement.style.setProperty("--bg-primary", "10 10 12");
document.documentElement.style.setProperty("--fg-primary", "255 255 255");
