const express = require('express');
const router = express.Router();
const { generateToken, verifyCredentials, loginRateLimit } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login do dashboard
 */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username e password são obrigatórios'
      });
    }

    const isValid = await verifyCredentials(username, password);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    const token = generateToken(username);
    
    res.json({
      success: true,
      data: {
        token,
        username,
        expiresIn: '24h'
      },
      message: 'Login realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verificar se token é válido
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token é obrigatório'
      });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dashdocker-secret-key-change-in-production';
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          error: 'Token inválido ou expirado'
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          username: decoded.username,
          expiresAt: new Date(decoded.exp * 1000).toISOString()
        }
      });
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/auth/config
 * Obter configuração de autenticação
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        requiresAuth: true,
        username: process.env.DASHBOARD_USERNAME || 'admin'
      }
    });
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
