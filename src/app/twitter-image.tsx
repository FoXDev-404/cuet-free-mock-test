import { renderSocialImage, SOCIAL_IMAGE_SIZE } from "@/lib/social-image";

export const alt = "CUETFreeMockTest.Com — free CUET UG mock tests and previous year papers";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default function TwitterImage() {
  return renderSocialImage();
}
