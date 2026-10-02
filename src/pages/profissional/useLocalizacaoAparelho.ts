import { useCallback, useEffect, useState } from 'react'

export type LocalAparelho = {
  estado: 'pedindo' | 'pronta' | 'negada' | 'indisponivel'
  lat?: number
  lng?: number
}

export function useLocalizacaoAparelho() {
  const [local, setLocal] = useState<LocalAparelho>({ estado: 'pedindo' })
  const [tentativa, setTentativa] = useState(0)
  const pedir = useCallback(() => setTentativa((valor) => valor + 1), [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocal({ estado: 'indisponivel' })
      return
    }
    setLocal((atual) => (atual.estado === 'pronta' ? atual : { estado: 'pedindo' }))
    const id = navigator.geolocation.watchPosition(
      (posicao) => {
        setLocal({
          estado: 'pronta',
          lat: posicao.coords.latitude,
          lng: posicao.coords.longitude,
        })
      },
      (erro) => {
        setLocal({ estado: erro.code === 1 ? 'negada' : 'indisponivel' })
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [tentativa])

  return { local, pedir }
}
