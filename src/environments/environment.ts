export const environment = {
    production: true,
    // Relative base: in dev the proxy strips /api, in prod Vercel rewrites
    // /api/:path* to the Railway backend (see vercel.json).
    apiBaseUrl: '',
};
