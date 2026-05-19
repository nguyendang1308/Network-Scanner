import { useEffect, useRef, useState, useCallback } from 'react'

function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelayRef = useRef(2000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!isMountedRef.current) return
    // Clear any pending reconnect before creating a new connection
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    // Close existing socket if any
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null
        wsRef.current.close()
      } catch {
        // ignore
      }
      wsRef.current = null
    }

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws
      setReadyState(WebSocket.CONNECTING)

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close()
          return
        }
        setReadyState(WebSocket.OPEN)
        reconnectDelayRef.current = 2000
      }

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return
        setLastMessage(event.data)
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!isMountedRef.current) return
        setReadyState(WebSocket.CLOSED)
        const delay = Math.min(reconnectDelayRef.current, 30000)
        reconnectDelayRef.current = delay * 2
        reconnectTimerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        // Let onclose handle reconnection
      }
    } catch {
      setReadyState(WebSocket.CLOSED)
      if (!isMountedRef.current) return
      const delay = Math.min(reconnectDelayRef.current, 30000)
      reconnectDelayRef.current = delay * 2
      reconnectTimerRef.current = setTimeout(connect, delay)
    }
  }, [url])

  useEffect(() => {
    isMountedRef.current = true
    connect()
    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null
          wsRef.current.close()
        } catch {
          // ignore
        }
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((data: string) => {
    wsRef.current?.send(data)
  }, [])

  return { lastMessage, readyState, sendMessage }
}

export default useWebSocket
