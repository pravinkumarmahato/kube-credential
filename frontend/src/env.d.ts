/// <reference types="vite/client" />

// Minimal ImportMetaEnv for our Vite environment variables used in the app
interface ImportMetaEnv {
  readonly VITE_ISSUE_API?: string;
  readonly VITE_VERIFY_API?: string;
  // more env vars can be added here
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
