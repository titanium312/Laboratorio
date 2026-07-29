import { Request, Response } from 'express';
import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.saludplus.co';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ 
        error: 'Usuario y contraseña son requeridos' 
      });
      return; // <-- AÑADIR RETURN
    }

    console.log(`🔐 Intentando login para: ${username}`);

    const response = await axios.post(
      `${API_BASE_URL}/api/auth/Login`,
      { username, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`✅ Login exitoso para: ${username}`);
    
    // Devolver la respuesta exacta de la API
    res.json(response.data);
    return; // <-- AÑADIR RETURN (opcional pero buena práctica)
    
  } catch (error: any) {
    console.error('❌ Error en login:', error.message);
    
    if (error.response) {
      // La API respondió con un error
      res.status(error.response.status).json({
        error: error.response.data?.errorMessage || error.response.data?.message || 'Error en autenticación',
        details: error.response.data
      });
    } else if (error.request) {
      // No hubo respuesta de la API
      res.status(503).json({
        error: 'El servicio de autenticación no está disponible',
        details: error.message
      });
    } else {
      // Error interno
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error.message
      });
    }
    return; // <-- AÑADIR RETURN
  }
};

export const enviarResultados = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
      return; // <-- AÑADIR RETURN
    }

    const token = authHeader.substring(7);
    const payload = req.body;

    console.log(`📤 Enviando resultados para paciente: ${payload.numero}`);

    const response = await axios.post(
      `${API_BASE_URL}/-rb-/automata`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000
      }
    );

    console.log(`✅ Resultados enviados para: ${payload.numero}`);
    res.json(response.data);
    return; // <-- AÑADIR RETURN
    
  } catch (error: any) {
    console.error('❌ Error enviando resultados:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || error.response.data?.error || 'Error en el servidor',
        details: error.response.data
      });
    } else if (error.request) {
      res.status(503).json({
        success: false,
        message: 'El servicio no está disponible',
        details: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        details: error.message
      });
    }
    return; // <-- AÑADIR RETURN
  }
};