import { ImageResponse } from 'next/og';
import { siteSocialImage } from '@/lib/site-social-image';

export const alt = 'Farm Machine Specs — farm equipment specs, parts and fitment reference';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(siteSocialImage(), size);
}
