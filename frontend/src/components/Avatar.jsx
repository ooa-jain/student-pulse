import { useEffect, useState } from 'react'

import { avatarUrl, localAvatarUrl } from '../lib/avatar'

/**
 * <img> for an avatar seed. Tries the DiceBear face first and silently swaps to
 * the locally drawn one if the network blocks it, so the picker is never empty.
 */
export default function Avatar({ seed, alt = '', ...rest }) {
  const [src, setSrc] = useState(() => avatarUrl(seed))

  useEffect(() => setSrc(avatarUrl(seed)), [seed])

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        const local = localAvatarUrl(seed)
        if (src !== local) setSrc(local)
      }}
    />
  )
}
