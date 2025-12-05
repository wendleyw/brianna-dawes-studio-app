// Miro SDK client wrapper for REST API calls
class MiroClient {
  private baseUrl = 'https://api.miro.com/v2';
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.accessToken;
    if (!token) {
      throw new Error('Miro access token not set');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Miro API error: ${response.status}`);
    }

    return response.json();
  }

  // Board operations
  async getBoard(boardId: string) {
    return this.request<{
      id: string;
      name: string;
      description: string;
      viewLink: string;
      accessLink: string;
      createdAt: string;
      modifiedAt: string;
    }>(`/boards/${boardId}`);
  }

  async createBoard(teamId: string, name: string, description?: string) {
    return this.request<{ id: string; viewLink: string }>('/boards', {
      method: 'POST',
      body: JSON.stringify({ teamId, name, description }),
    });
  }

  // Frame operations
  async createFrame(
    boardId: string,
    data: {
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fillColor?: string;
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/frames`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: data.title,
          format: 'custom',
        },
        position: { x: data.x, y: data.y },
        geometry: { width: data.width, height: data.height },
        style: data.fillColor ? { fillColor: data.fillColor } : undefined,
      }),
    });
  }

  async getFrames(boardId: string) {
    return this.request<{ data: Array<{ id: string; data: { title: string }; position: { x: number; y: number }; geometry: { width: number; height: number } }> }>(
      `/boards/${boardId}/frames`
    );
  }

  async updateFrame(
    boardId: string,
    frameId: string,
    data: Partial<{
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fillColor: string;
    }>
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.data = { title: data.title };
    if (data.x !== undefined || data.y !== undefined) {
      updateData.position = { x: data.x, y: data.y };
    }
    if (data.width !== undefined || data.height !== undefined) {
      updateData.geometry = { width: data.width, height: data.height };
    }
    if (data.fillColor) {
      updateData.style = { fillColor: data.fillColor };
    }

    return this.request<{ id: string }>(`/boards/${boardId}/frames/${frameId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteFrame(boardId: string, frameId: string) {
    return this.request(`/boards/${boardId}/frames/${frameId}`, {
      method: 'DELETE',
    });
  }

  // Card operations
  async createCard(
    boardId: string,
    data: {
      title: string;
      description?: string;
      x: number;
      y: number;
      dueDate?: string;
      style?: { cardTheme?: string };
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/cards`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
        },
        position: { x: data.x, y: data.y },
        style: data.style,
      }),
    });
  }

  async getCards(boardId: string) {
    return this.request<{ data: Array<{ id: string; data: { title: string; description?: string; dueDate?: string }; position: { x: number; y: number }; style?: { cardTheme?: string } }> }>(
      `/boards/${boardId}/cards`
    );
  }

  async updateCard(
    boardId: string,
    cardId: string,
    data: Partial<{
      title: string;
      description: string;
      x: number;
      y: number;
      dueDate: string;
      style: { cardTheme?: string };
    }>
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.title || data.description || data.dueDate) {
      updateData.data = {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
      };
    }
    if (data.x !== undefined || data.y !== undefined) {
      updateData.position = { x: data.x, y: data.y };
    }
    if (data.style) {
      updateData.style = data.style;
    }

    return this.request<{ id: string }>(`/boards/${boardId}/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteCard(boardId: string, cardId: string) {
    return this.request(`/boards/${boardId}/cards/${cardId}`, {
      method: 'DELETE',
    });
  }

  // Sticky note operations
  async createStickyNote(
    boardId: string,
    data: {
      content: string;
      x: number;
      y: number;
      fillColor?: string;
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/sticky_notes`, {
      method: 'POST',
      body: JSON.stringify({
        data: { content: data.content },
        position: { x: data.x, y: data.y },
        style: { fillColor: data.fillColor || 'yellow' },
      }),
    });
  }

  async getStickyNotes(boardId: string) {
    return this.request<{ data: Array<{ id: string; data: { content: string }; position: { x: number; y: number }; style?: { fillColor?: string } }> }>(
      `/boards/${boardId}/sticky_notes`
    );
  }

  // Image operations
  async createImage(
    boardId: string,
    data: {
      url: string;
      x: number;
      y: number;
      width?: number;
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/images`, {
      method: 'POST',
      body: JSON.stringify({
        data: { url: data.url },
        position: { x: data.x, y: data.y },
        geometry: data.width ? { width: data.width } : undefined,
      }),
    });
  }

  // Connector operations
  async createConnector(
    boardId: string,
    data: {
      startItemId: string;
      endItemId: string;
      style?: { strokeColor?: string; strokeWidth?: number };
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/connectors`, {
      method: 'POST',
      body: JSON.stringify({
        startItem: { id: data.startItemId },
        endItem: { id: data.endItemId },
        style: data.style,
      }),
    });
  }

  // Text operations
  async createText(
    boardId: string,
    data: {
      content: string;
      x: number;
      y: number;
      width?: number;
      style?: {
        color?: string;
        fontSize?: string;
        fontFamily?: string;
        textAlign?: 'left' | 'center' | 'right';
      };
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/texts`, {
      method: 'POST',
      body: JSON.stringify({
        data: { content: data.content },
        position: { x: data.x, y: data.y },
        geometry: data.width ? { width: data.width } : undefined,
        style: data.style,
      }),
    });
  }

  async updateText(
    boardId: string,
    textId: string,
    data: Partial<{
      content: string;
      x: number;
      y: number;
      width: number;
    }>
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.content) updateData.data = { content: data.content };
    if (data.x !== undefined || data.y !== undefined) {
      updateData.position = { x: data.x, y: data.y };
    }
    if (data.width !== undefined) {
      updateData.geometry = { width: data.width };
    }

    return this.request<{ id: string }>(`/boards/${boardId}/texts/${textId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  // Shape operations
  async createShape(
    boardId: string,
    data: {
      shape: 'rectangle' | 'circle' | 'triangle' | 'wedge_round_rectangle_callout' | 'round_rectangle';
      x: number;
      y: number;
      width: number;
      height: number;
      content?: string;
      style?: {
        fillColor?: string;
        borderColor?: string;
        borderWidth?: number;
        fontColor?: string;
        fontSize?: string;
      };
    }
  ) {
    return this.request<{ id: string }>(`/boards/${boardId}/shapes`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          shape: data.shape,
          content: data.content,
        },
        position: { x: data.x, y: data.y },
        geometry: { width: data.width, height: data.height },
        style: {
          fillColor: data.style?.fillColor,
          borderColor: data.style?.borderColor,
          borderWidth: data.style?.borderWidth,
          fontColor: data.style?.fontColor,
          fontSize: data.style?.fontSize,
        },
      }),
    });
  }

  async updateShape(
    boardId: string,
    shapeId: string,
    data: Partial<{
      content: string;
      x: number;
      y: number;
      width: number;
      height: number;
      style: {
        fillColor?: string;
        borderColor?: string;
      };
    }>
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.content) updateData.data = { content: data.content };
    if (data.x !== undefined || data.y !== undefined) {
      updateData.position = { x: data.x, y: data.y };
    }
    if (data.width !== undefined || data.height !== undefined) {
      updateData.geometry = { width: data.width, height: data.height };
    }
    if (data.style) {
      updateData.style = data.style;
    }

    return this.request<{ id: string }>(`/boards/${boardId}/shapes/${shapeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteShape(boardId: string, shapeId: string) {
    return this.request(`/boards/${boardId}/shapes/${shapeId}`, {
      method: 'DELETE',
    });
  }

  async deleteText(boardId: string, textId: string) {
    return this.request(`/boards/${boardId}/texts/${textId}`, {
      method: 'DELETE',
    });
  }

  async deleteStickyNote(boardId: string, stickyId: string) {
    return this.request(`/boards/${boardId}/sticky_notes/${stickyId}`, {
      method: 'DELETE',
    });
  }
}

export const miroClient = new MiroClient();
