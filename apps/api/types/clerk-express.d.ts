declare module "@clerk/express" {
  export function verifyToken(
    token: string,
    options: { secretKey: string }
  ): Promise<{ sub: string; email?: string }>;
}
