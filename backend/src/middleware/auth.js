const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dashdocker-secret-key-change-in-production';
const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME || 'admin';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

/**
 * Middleware de autenticação JWT
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acesso necessário'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }
    req.user = user;
    next();
  });
};

/**
 * Gerar token JWT
 */
const generateToken = (username) => {
  return jwt.sign(
    { username, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Verificar credenciais
 */
const verifyCredentials = async (username, password) => {
  // Em produção, você deve usar hash de senha
  // Para simplicidade, estamos comparando diretamente
  const isValidUsername = username === DASHBOARD_USERNAME;
  const isValidPassword = password === DASHBOARD_PASSWORD;
  
  return isValidUsername && isValidPassword;
};

/**
 * Middleware de rate limiting para login
 */
const loginRateLimit = (req, res, next) => {
  // Implementação simples de rate limiting
  // Em produção, use express-rate-limit
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!global.loginAttempts) {
    global.loginAttempts = new Map();
  }
  
  const attempts = global.loginAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
  
  // Reset contador após 15 minutos
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    attempts.count = 0;
  }
  
  // Máximo 5 tentativas em 15 minutos
  if (attempts.count >= 5) {
    return res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    });
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  global.loginAttempts.set(clientIP, attempts);
  
  next();
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyCredentials,
  loginRateLimit
};
