import type { NextConfig } from "next";

const adminHeaders=[
 {key:"Cache-Control",value:"private, no-store, max-age=0"},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"no-referrer"},
 {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
 {key:"Content-Security-Policy",value:"frame-ancestors 'none'; base-uri 'none'; object-src 'none'"},
];
const nextConfig: NextConfig = {async headers(){return[{source:"/admin/:path*",headers:adminHeaders},{source:"/api/admin/:path*",headers:adminHeaders}];}};

export default nextConfig;
