import { useState, useEffect } from 'react'

const artistImageCache = new Map<string, string | null>()

export function useArtistImage(artistName: string | undefined) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    if (!artistName) {
      setImageUrl(null)
      return
    }

    const trimmedArtist = artistName.trim()
    if (!trimmedArtist) {
      setImageUrl(null)
      return
    }

    // Check cache
    if (artistImageCache.has(trimmedArtist)) {
      setImageUrl(artistImageCache.get(trimmedArtist) || null)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(false)

    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmedArtist)}&entity=musicArtist&limit=1`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.json()
      })
      .then((data) => {
        const results = data.results
        let imgUrl: string | null = null
        if (results && results.length > 0 && results[0].artworkUrl100) {
          imgUrl = results[0].artworkUrl100.replace('100x100bb', '600x600bb')
        }
        artistImageCache.set(trimmedArtist, imgUrl)
        if (isMounted) {
          setImageUrl(imgUrl)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error(`Failed to fetch iTunes artist image for ${trimmedArtist}:`, err)
        artistImageCache.set(trimmedArtist, null)
        if (isMounted) {
          setImageUrl(null)
          setError(true)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [artistName])

  return { imageUrl, isLoading, error }
}
