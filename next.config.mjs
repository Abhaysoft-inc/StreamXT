/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],



    turbopack: {
        resolveAlias: {
            canvas: './empty.js'
        }
    }

};

export default nextConfig;
