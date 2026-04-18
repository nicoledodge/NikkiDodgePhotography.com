/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PORTFOLIO_IMAGE_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
