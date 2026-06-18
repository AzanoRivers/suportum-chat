import { AzanoLogo } from './AzanoLogo'

type LogoSize = 'sm' | 'md' | 'lg'

interface ProjectLogoProps {
  src?: string | null
  size?: LogoSize
  className?: string
}

export function ProjectLogo({ src, size = 'md', className }: ProjectLogoProps) {
  const base = ['project-logo', `project-logo--${size}`]
  if (className) base.push(className)

  if (src) {
    return (
      <div className={base.join(' ')}>
        <img src={src} alt="Project logo" />
      </div>
    )
  }
  return (
    <div className={[...base, 'project-logo--default'].join(' ')}>
      <AzanoLogo />
    </div>
  )
}
