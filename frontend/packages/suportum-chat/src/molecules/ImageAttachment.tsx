import { useState } from 'react'

interface ImageAttachmentProps {
  url: string
  width: number
  height: number
}

export function ImageAttachment({ url, width, height }: ImageAttachmentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <img
        src={url}
        width={width}
        height={height}
        alt=""
        loading="lazy"
        className="max-w-[240px] max-h-[200px] object-cover rounded-(--radius-sm) cursor-pointer mt-1 block"
        onClick={() => setLightboxOpen(true)}
      />

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-overlay-heavy)"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={url}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
