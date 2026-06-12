const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'habitflow-dev-secret';
const JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(value) {
    return Buffer.from(value).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = padding ? `${normalized}${'='.repeat(4 - padding)}` : normalized;
    return Buffer.from(padded, 'base64').toString('utf8');
}

function signJwt(payload, secret = JWT_SECRET, expiresInSeconds = JWT_EXPIRES_IN_SECONDS) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

    return `${signingInput}.${signature}`;
}

function verifyJwt(token, secret = JWT_SECRET) {
    if (!token || typeof token !== 'string') {
        throw new Error('Authentication required');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid authentication token');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    let header;
    let payload;

    try {
        header = JSON.parse(base64UrlDecode(encodedHeader));
        payload = JSON.parse(base64UrlDecode(encodedPayload));
    } catch (error) {
        throw new Error('Invalid authentication token');
    }

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        throw new Error('Invalid authentication token');
    }

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    if (
        expectedBuffer.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
        throw new Error('Invalid authentication token');
    }

    if (typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000)) {
        throw new Error('Authentication token expired');
    }

    return payload;
}

function issueAuthToken(user) {
    if (!user || !user._id) {
        throw new Error('Unable to create authentication token');
    }

    return signJwt({
        sub: user._id.toString(),
        username: user.username,
        tv: Number(user.tokenVersion || 0)
    });
}

module.exports = {
    signJwt,
    verifyJwt,
    issueAuthToken,
    JWT_SECRET
};
