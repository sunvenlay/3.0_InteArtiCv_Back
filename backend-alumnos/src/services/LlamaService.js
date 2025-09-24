const axios = require('axios');

class LlamaService {
  constructor() {
    this.baseURL = process.env.LLAMA_BASE_URL || 'http://127.0.0.1:1234';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // 120 segundos
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // 🏥 Verificar conexión con Llama
  async checkConnection() {
    try {
      const response = await this.client.get('/v1/models');
      return {
        connected: true,
        models: response.data
      };
    } catch (error) {
      console.error('❌ Error conectando con Llama:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // 💬 Chat completion genérico
  async chatCompletion(messages, options = {}) {
  try {
    // Si no se especifica modelo, usar el primero disponible
    let modelToUse = options.model;
    
    if (!modelToUse) {
      const modelsResponse = await this.checkConnection();
      if (modelsResponse.connected && modelsResponse.models?.data?.length > 0) {
        modelToUse = modelsResponse.models.data[0].id;
      } else {
        modelToUse = 'meta-llama-3.1-8b-instruct'; // fallback
      }
    }

    const payload = {
      model: modelToUse,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: false,
      ...options
    };

    const response = await this.client.post('/v1/chat/completions', payload);
    
    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model
    };
  } catch (error) {
    console.error('❌ Error en chat completion:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

  // 📄 RF-102: Analizar contenido de CV
  async analizarCV(contenidoTexto, nombreAlumno = '') {
    const prompt = `
Eres un experto en análisis de currículums vitae. Analiza el siguiente CV y extrae información estructurada.

CV de ${nombreAlumno}:
${contenidoTexto}

Por favor proporciona un análisis detallado en formato JSON con:
1. **fortalezas**: Array de principales fortalezas identificadas
2. **habilidades_tecnicas**: Array de habilidades técnicas encontradas
3. **habilidades_blandas**: Array de habilidades blandas identificadas
4. **areas_mejora**: Array de áreas que podrían mejorarse
5. **experiencia_resumen**: Resumen de la experiencia laboral
6. **educacion_resumen**: Resumen de la formación académica
7. **puntos_destacados**: Aspectos más llamativos del perfil

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un experto analista de recursos humanos especializado en análisis de CVs. Respondes siempre en formato JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.3, // Más determinista para análisis
        max_tokens: 1500
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Intentar parsear JSON
      const analisis = JSON.parse(response.content);
      
      return {
        success: true,
        analisis: analisis,
        contenido_extraido: response.content
      };
    } catch (error) {
      console.error('❌ Error analizando CV:', error);
      return {
        success: false,
        error: error.message,
        fallback_content: contenidoTexto.substring(0, 500) + '...'
      };
    }
  }

  // 🎯 RF-105: Evaluar respuesta de entrevista
  async evaluarRespuestaEntrevista(pregunta, respuesta, contexto = '') {
    const prompt = `
Eres un experto entrevistador de recursos humanos. Evalúa esta respuesta de entrevista laboral.

**Pregunta:** ${pregunta}
**Respuesta del candidato:** ${respuesta}
${contexto ? `**Contexto:** ${contexto}` : ''}

Proporciona una evaluación en formato JSON con:
1. **puntuacion**: Número del 1-10 (10 = excelente)
2. **retroalimentacion**: Feedback constructivo específico
3. **fortalezas**: Array de aspectos positivos identificados
4. **areas_mejora**: Array de aspectos a mejorar
5. **sugerencias**: Array de consejos específicos para mejorar
6. **ejemplos_mejores**: Ejemplo de cómo podría responder mejor

Sé constructivo y específico en tus comentarios.
Responde ÚNICAMENTE con el JSON, sin texto adicional.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un experto entrevistador de RRHH. Evalúas respuestas de forma constructiva y objetiva. Siempre respondes en JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.4,
        max_tokens: 1000
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const evaluacion = JSON.parse(response.content);
      
      return {
        success: true,
        evaluacion: evaluacion
      };
    } catch (error) {
      console.error('❌ Error evaluando respuesta:', error);
      return {
        success: false,
        error: error.message,
        fallback: {
          puntuacion: 7,
          retroalimentacion: 'Respuesta registrada. Evaluación pendiente.',
          fortalezas: ['Participación activa'],
          areas_mejora: ['Evaluación pendiente'],
          sugerencias: ['Continúa practicando']
        }
      };
    }
  }

  // 🤖 RF-104: Generar pregunta de seguimiento inteligente
  async generarPreguntaSeguimiento(preguntaAnterior, respuestaAnterior, tipoEntrevista = 'general') {
    const prompt = `
Eres un entrevistador experto. Basándote en la interacción anterior, genera una pregunta de seguimiento inteligente.

**Pregunta anterior:** ${preguntaAnterior}
**Respuesta del candidato:** ${respuestaAnterior}
**Tipo de entrevista:** ${tipoEntrevista}

Genera una pregunta de seguimiento que:
1. Sea relevante a la respuesta dada
2. Profundice en aspectos importantes
3. Evalúe habilidades específicas
4. Sea apropiada para el contexto laboral

Responde ÚNICAMENTE con la pregunta, sin texto adicional.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un entrevistador profesional experto en hacer preguntas de seguimiento inteligentes y relevantes.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.6,
        max_tokens: 200
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      return {
        success: true,
        pregunta: response.content.trim()
      };
    } catch (error) {
      console.error('❌ Error generando pregunta:', error);
      return {
        success: false,
        error: error.message,
        fallback: '¿Podrías darme un ejemplo específico de esa situación?'
      };
    }
  }

  // 📊 Generar resumen de informe
  async generarResumenInforme(datosCV, analisisIA) {
    const prompt = `
Genera un resumen ejecutivo profesional basado en el análisis del CV.

**Datos del CV:** ${JSON.stringify(datosCV, null, 2)}
**Análisis realizado:** ${JSON.stringify(analisisIA, null, 2)}

Crea un resumen ejecutivo de 2-3 párrafos que incluya:
1. Perfil profesional general
2. Principales fortalezas y competencias
3. Recomendaciones de desarrollo

El tono debe ser profesional y constructivo.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un consultor de recursos humanos experto en redactar informes profesionales de análisis de talento.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.5,
        max_tokens: 800
      });

      return {
        success: true,
        resumen: response.success ? response.content : 'Resumen pendiente de generación'
      };
    } catch (error) {
      console.error('❌ Error generando resumen:', error);
      return {
        success: false,
        error: error.message,
        fallback: 'Informe de análisis de CV generado automáticamente.'
      };
    }
  }

  // 🔄 Test de conectividad
  async testConnection() {
    console.log('🧪 Probando conexión con Llama 3.1...');
    
    const testMessage = [
      {
        role: 'user',
        content: 'Responde con "OK" si puedes leerme correctamente.'
      }
    ];

    const result = await this.chatCompletion(testMessage, {
      max_tokens: 50,
      temperature: 0.1
    });

    if (result.success) {
      console.log('✅ Conexión con Llama exitosa:', result.content);
    } else {
      console.log('❌ Error de conexión:', result.error);
    }

    return result;
  }
}

// Singleton instance
const llamaService = new LlamaService();

module.exports = llamaService;