'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import type { Socket } from 'socket.io-client'
import { PeerConnection, type CallKind } from './peer-connection'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export type CallStatus =
  | 'idle'
  | 'initializing'
  | 'waiting-offer'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'ended'

interface UseCallOpts {
  socket: Socket | null
  consultationId: string
  kind: CallKind
  /**
   * Quem inicia a chamada (cria a offer). Convenção: o **cliente** sempre é o
   * caller (criou o accept-call → quem entra primeiro na sala). O consultor é
   * o callee (espera a offer).
   */
  role: 'caller' | 'callee'
  authToken: string
}

interface UseCallReturn {
  status: CallStatus
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  micEnabled: boolean
  cameraEnabled: boolean
  toggleMic: () => void
  toggleCamera: () => void
  end: (reason?: string) => void
}

/**
 * Hook que encapsula handshake WebRTC inteiro.
 *
 * Caller flow:
 *  1. Busca ICE servers (HTTP).
 *  2. getUserMedia.
 *  3. createOffer + emit 'webrtc-offer'.
 *  4. Aguarda 'webrtc-answer', aplica.
 *  5. Troca ICE candidates até `connectionState === 'connected'`.
 *
 * Callee flow:
 *  1. Busca ICE servers.
 *  2. getUserMedia.
 *  3. Aguarda 'webrtc-offer', cria answer, emit 'webrtc-answer'.
 *  4. Troca ICE candidates.
 */
export function useCall({
  socket,
  consultationId,
  kind,
  role,
  authToken,
}: UseCallOpts): UseCallReturn {
  const [status, setStatus] = useState<CallStatus>('idle')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(kind === 'video')

  const pcRef = useRef<PeerConnection | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const remoteSetRef = useRef(false)
  const startedRef = useRef(false)

  const end = useCallback(
    (reason?: string) => {
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
      socket?.emit('webrtc-call-end', { consultationId, reason: reason || 'user' })
      setStatus('ended')
    },
    [socket, consultationId],
  )

  useEffect(() => {
    if (!socket || !consultationId || startedRef.current) return
    startedRef.current = true
    let cancelled = false

    async function start() {
      setStatus('initializing')
      try {
        const r = await axios.get(`${API}/webrtc/ice-servers`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const iceServers = (r.data?.iceServers || []) as RTCIceServer[]

        if (cancelled) return

        const pc = new PeerConnection(iceServers, kind, {
          onLocalIce: (candidate) => {
            socket!.emit('webrtc-ice-candidate', { consultationId, candidate })
          },
          onRemoteStream: (s) => setRemoteStream(s),
          onConnectionStateChange: (st) => {
            if (st === 'connected') setStatus('connected')
            else if (st === 'failed' || st === 'closed') setStatus('failed')
          },
        })
        pcRef.current = pc

        const local = await pc.startLocalMedia()
        if (cancelled) {
          pc.close()
          return
        }
        setLocalStream(local)

        if (role === 'caller') {
          const offer = await pc.createOffer()
          socket!.emit('webrtc-offer', { consultationId, sdp: offer })
          setStatus('connecting')
        } else {
          setStatus('waiting-offer')
        }
      } catch (err) {
        console.error('[useCall] init failed', err)
        setStatus('failed')
      }
    }

    start()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, consultationId, kind, role, authToken])

  // Wire socket events
  useEffect(() => {
    if (!socket) return

    const onOffer = async (data: any) => {
      if (data.consultationId !== consultationId) return
      const pc = pcRef.current
      if (!pc) return
      try {
        const answer = await pc.createAnswer(data.sdp)
        remoteSetRef.current = true
        // Drena ICE candidates que chegaram antes do remote description
        for (const c of pendingIceRef.current) await pc.addRemoteIce(c)
        pendingIceRef.current = []
        socket.emit('webrtc-answer', { consultationId, sdp: answer })
        setStatus('connecting')
      } catch (err) {
        console.error('[useCall] answer failed', err)
        setStatus('failed')
      }
    }

    const onAnswer = async (data: any) => {
      if (data.consultationId !== consultationId) return
      const pc = pcRef.current
      if (!pc) return
      try {
        await pc.acceptAnswer(data.sdp)
        remoteSetRef.current = true
        for (const c of pendingIceRef.current) await pc.addRemoteIce(c)
        pendingIceRef.current = []
      } catch (err) {
        console.error('[useCall] acceptAnswer failed', err)
      }
    }

    const onIce = async (data: any) => {
      if (data.consultationId !== consultationId) return
      const pc = pcRef.current
      if (!pc || !data.candidate) return
      if (!remoteSetRef.current) {
        pendingIceRef.current.push(data.candidate)
        return
      }
      await pc.addRemoteIce(data.candidate)
    }

    const onCallEnd = (data: any) => {
      if (data.consultationId !== consultationId) return
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
      setStatus('ended')
    }

    socket.on('webrtc-offer', onOffer)
    socket.on('webrtc-answer', onAnswer)
    socket.on('webrtc-ice-candidate', onIce)
    socket.on('webrtc-call-end', onCallEnd)

    return () => {
      socket.off('webrtc-offer', onOffer)
      socket.off('webrtc-answer', onAnswer)
      socket.off('webrtc-ice-candidate', onIce)
      socket.off('webrtc-call-end', onCallEnd)
    }
  }, [socket, consultationId])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
    }
  }, [])

  const toggleMic = useCallback(() => {
    setMicEnabled((v) => {
      const next = !v
      pcRef.current?.setMicEnabled(next)
      socket?.emit('webrtc-media-toggle', { consultationId, mic: next })
      return next
    })
  }, [socket, consultationId])

  const toggleCamera = useCallback(() => {
    setCameraEnabled((v) => {
      const next = !v
      pcRef.current?.setCameraEnabled(next)
      socket?.emit('webrtc-media-toggle', { consultationId, camera: next })
      return next
    })
  }, [socket, consultationId])

  return {
    status,
    remoteStream,
    localStream,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    end,
  }
}
