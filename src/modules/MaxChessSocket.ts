export interface ChessChallenge {
  challengerNodeId: string;
  opponentNodeId: string;
  stakeAmount: string;
  timeControl: string;
}

export class MaxChessMatchmaking {
  private socket: WebSocket | null = null;

  public connect(meshGatewayUrl: string, nodeId: string) {
    this.socket = new WebSocket(`${meshGatewayUrl}/chess/ws?node_id=${nodeId}`);

    this.socket.onopen = () => {
      console.log('[MAX Chess] Secure mesh socket connected.');
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('[MAX Chess] Match state received:', message);
    };

    this.socket.onerror = (error) => {
      console.error('[MAX Chess] Mesh socket error:', error);
    };
  }

  public broadcastChallenge(challenge: ChessChallenge) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'CHALLENGE_SUBMIT', payload: challenge }));
    } else {
      console.error('[MAX Chess] Socket not open. Cannot broadcast match challenge.');
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
