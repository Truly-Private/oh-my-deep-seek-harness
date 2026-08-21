import type { IconProps } from './icons/props.ts'

/** Public URL served by the Web composition for the product logo. */
export const BRAND_LOGO_SRC = '/omdsh-logo.jpg'

/** Native dimensions of the cropped product logo. */
const BRAND_LOGO_RATIO = 304 / 351

/**
 * Render the product logo from the Web composition's public asset.
 * @param props.size - rendered width in px.
 * @param props.className - extra class for layout placement.
 * @returns the decorative product-logo image.
 */
export function BrandLogo({ size = 32, className }: IconProps) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      width={size}
      height={size * BRAND_LOGO_RATIO}
      className={className}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  )
}
