import { SignJWT, jwtVerify } from 'jose';

export interface TokenClaims {
  operatorId: string;
  storeId: string;
}

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signToken(claims: TokenClaims, secret: string): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(secret));
}

export async function verifyToken(token: string, secret: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  return {
    operatorId: String(payload.operatorId),
    storeId: String(payload.storeId),
  };
}
