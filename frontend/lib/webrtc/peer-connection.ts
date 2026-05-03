/**
 * Wrapper minimalista de RTCPeerConnection para chamadas 1-a-1 (cliente <-> consultor).
 * Sinalização é feita via socket.io (eventos webrtc-offer/answer/ice-candidate).
 *
 * Esta classe NÃO conhece socket.io — quem cria a instância passa callbacks
 * `onLocalIce`, `onRemoteStream` e chama `setRemoteDescription`/`addIceCandidate`
 * conforme recebe eventos do servidor.
 */
export type CallKind = 'voice' | 'video';

export interface PeerHandlers {
  onLocalIce: (candidate: RTCIceCandidateInit) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class PeerConnection {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream;
  private handlers: PeerHandlers;
  private kind: CallKind;

  constructor(
    iceServers: RTCIceServer[],
    kind: CallKind,
    handlers: PeerHandlers,
  ) {
    this.kind = kind;
    this.handlers = handlers;
    this.remoteStream = new MediaStream();
    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) handlers.onLocalIce(e.candidate.toJSON());
    };
    this.pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => this.remoteStream.addTrack(t));
      handlers.onRemoteStream(this.remoteStream);
    };
    this.pc.onconnectionstatechange = () => {
      handlers.onConnectionStateChange?.(this.pc.connectionState);
    };
  }

  /** Solicita microfone (e câmera, se kind='video') e adiciona ao peer. */
  async startLocalMedia(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        this.kind === 'video'
          ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          : false,
    };
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.localStream.getTracks().forEach((t) => this.pc.addTrack(t, this.localStream!));
    return this.localStream;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.kind === 'video',
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(
    remoteOffer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(remoteOffer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async acceptAnswer(remoteAnswer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(remoteAnswer);
  }

  async addRemoteIce(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      // Candidato pode chegar antes de setRemoteDescription; ignorar é seguro.
    }
  }

  setMicEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  close() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc.close();
  }
}
