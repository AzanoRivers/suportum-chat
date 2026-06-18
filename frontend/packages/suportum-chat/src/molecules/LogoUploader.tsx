import { useState, useRef, type ChangeEvent } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button } from '../atoms/Button'
import { Spinner } from '../atoms/Spinner'
import { useProjectBranding } from '../hooks/useProjectBranding'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

interface LogoUploaderProps {
  currentUrl?: string | null
  apiUrl: string
  onChange?: (url: string | null) => void
  disabled?: boolean
}

export function LogoUploader({ currentUrl, apiUrl, onChange, disabled = false }: LogoUploaderProps) {
  const { t } = useI18n()
  const { uploadLogo, deleteLogo, isUploading, error } = useProjectBranding(apiUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalError(null)

    if (file.size > MAX_SIZE_BYTES) {
      setLocalError('errors.UPLOAD_TOO_LARGE')
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError('errors.UPLOAD_TYPE_NOT_SUPPORTED')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      const url = await uploadLogo(file)
      onChange?.(url)
    } catch {
      // el error ya quedo seteado en el hook
    } finally {
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setLocalError(null)
    try {
      await deleteLogo()
      onChange?.(null)
    } catch {
      // error queda en el hook
    }
  }

  const displayUrl = previewUrl ?? currentUrl ?? null
  const errorCode = localError ?? error

  return (
    <div className="logo-uploader">
      <div className="logo-uploader__row">
        <div className="logo-uploader__preview" aria-live="polite">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="logo preview"
              className="logo-uploader__preview-img"
            />
          ) : (
            <span className="logo-uploader__preview-default">
              {t('settings.logoUseDefault')}
            </span>
          )}
        </div>

        <div className="logo-uploader__actions">
          <label className="logo-uploader__upload-label">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => { void handleFile(e) }}
              disabled={disabled || isUploading}
              className="logo-uploader__input"
            />
            <span className="logo-uploader__upload-btn">
              {isUploading ? (
                <>
                  <Spinner size="sm" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <Upload size={14} strokeWidth={1.8} />
                  <span>{t('settings.logoUpload')}</span>
                </>
              )}
            </span>
          </label>

          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { void handleRemove() }}
              disabled={disabled || isUploading}
              ariaLabel={t('settings.logoRemove')}
            >
              <Trash2 size={14} strokeWidth={1.8} />
              <span>{t('settings.logoRemove')}</span>
            </Button>
          )}
        </div>
      </div>

      {errorCode && (
        <p className="logo-uploader__error">
          {t(errorCode)}
        </p>
      )}

      <p className="logo-uploader__hint">
        {t('settings.logoUploadHint')}
      </p>
    </div>
  )
}
