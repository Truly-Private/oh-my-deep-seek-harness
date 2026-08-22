import { BrandLogo } from '@truly-private/omdsh-client-ui-primitives'
import type { HeroBrandMarkOwnerProps } from '@truly-private/omdsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@truly-private/omdsh-client-ui-sidebar/client'

type OfficialBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/**
 * Render the downstream product mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the downstream product mark.
 */
export function OfficialBrandMark({ size, className }: OfficialBrandMarkProps) {
  return <BrandLogo size={size} className={className} />
}

/**
 * Render the downstream product name without its independently slotted mark.
 * @returns the downstream product name.
 */
export function OfficialBrandName() {
  return <span>oh-my-deepseek-harness</span>
}
