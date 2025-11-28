// Validar que las credenciales de Agora existan
if (!process.env.AGORA_APP_ID || !process.env.AGORA_APP_CERTIFICATE) {
  console.error('Agora credentials missing!');
  console.error('AGORA_APP_ID:', process.env.AGORA_APP_ID ? 'Set' : 'Missing');
  console.error('AGORA_APP_CERTIFICATE:', process.env.AGORA_APP_CERTIFICATE ? 'Set' : 'Missing');
}

export class AgoraService {
  private appId: string;
  private appCertificate: string;

  constructor() {
    this.appId = process.env.AGORA_APP_ID!;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE!;
  }

  /**
   * Crear un nuevo livestream (canal de Agora)
   * En Agora, no necesitamos crear streams previamente - solo generamos un channel name único
   */
  async createLiveStream(options: {
    channelName?: string;
  } = {}) {
    try {
      // Generar un nombre de canal único si no se proporciona
      const channelName = options.channelName || `stream-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      console.log('Creating Agora channel:', channelName);

      return {
        channelName,
        appId: this.appId,
        status: 'idle',
      };
    } catch (error: any) {
      console.error('Error creating Agora channel:', error);
      throw new Error(`Failed to create live stream: ${error.message}`);
    }
  }

  /**
   * Obtener información de un livestream
   * En Agora, el estado se maneja en el cliente, aquí solo devolvemos info básica
   */
  async getLiveStream(channelName: string) {
    try {
      return {
        channelName,
        appId: this.appId,
        status: 'idle', // El estado real se maneja en tiempo real desde el cliente
        isActive: false, // Esto se actualiza desde Firebase en tiempo real
      };
    } catch (error) {
      console.error('Error retrieving Agora channel:', error);
      throw new Error('Failed to retrieve live stream');
    }
  }

  /**
   * Eliminar un livestream
   * En Agora, los canales se limpian automáticamente cuando todos los usuarios salen
   */
  async deleteLiveStream(channelName: string) {
    try {
      console.log('Deleting Agora channel:', channelName);
      // No hay necesidad de eliminar explícitamente en Agora
      // Los canales se limpian automáticamente
      return { success: true };
    } catch (error) {
      console.error('Error deleting Agora channel:', error);
      throw new Error('Failed to delete live stream');
    }
  }

  /**
   * Obtener estadísticas del livestream
   * Para estadísticas en tiempo real, necesitarías usar Agora Analytics API
   */
  async getStreamStats(channelName: string) {
    try {
      return {
        channelName,
        status: 'idle',
        isActive: false,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting stream stats:', error);
      throw new Error('Failed to get stream stats');
    }
  }

  /**
   * Obtener el App ID de Agora (para uso en el cliente)
   */
  getAppId() {
    return this.appId;
  }

  /**
   * Validar que las credenciales estén configuradas
   */
  isConfigured() {
    return !!(this.appId && this.appCertificate);
  }
}

export const agoraService = new AgoraService();
