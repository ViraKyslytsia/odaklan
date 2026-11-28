const jwt = require('jsonwebtoken');
const { ipKeyGenerator } = require('express-rate-limit');

// Ключ для лимита запросов: залогиненного считаем по его аккаунту, остальных по IP.
// Так целый класс за одним Wi-Fi (общий IP) не упирается в общий лимит.
// Токен проверяем подписью, поэтому подделать чужой ключ нельзя.
module.exports = function rateKey(req) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
        try {
            const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
            if (id) return `user:${id}`;
        } catch {
            // плохой токен: считаем как незалогиненного, по IP
        }
    }
    return `ip:${ipKeyGenerator(req.ip)}`;
};