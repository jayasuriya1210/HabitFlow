const crypto = require('crypto');

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return { salt, hash };
}

function verifyPassword(password, passwordSalt, passwordHash) {
    const { hash } = hashPassword(password, passwordSalt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(passwordHash, 'hex'));
}

module.exports = {
    normalizeUsername,
    hashPassword,
    verifyPassword
};
