/**
 * AttendX — Profile Avatar Utility
 *
 * Returns the correct avatar image source for a user based on:
 *   1. User-uploaded profile picture (highest priority)
 *   2. Gender-based default avatar (male / female)
 *   3. Neutral fallback (if gender is unknown/missing)
 *
 * Gender values normalised: 'male' | 'm' | 'Male' | 'M'  → male avatar
 *                           'female' | 'f' | 'Female' | 'F' → female avatar
 */

import { ImageSourcePropType } from 'react-native';

const MALE_AVATAR   = require('../../assets/avatar_male.jpg')   as ImageSourcePropType;
const FEMALE_AVATAR = require('../../assets/avatar_female.jpg') as ImageSourcePropType;

/**
 * Normalise a raw gender string to a canonical 'male' | 'female' | null value.
 */
export const normaliseGender = (gender?: string | null): 'male' | 'female' | null => {
  if (!gender) return null;
  const g = gender.toLowerCase().trim();
  if (g === 'male'   || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  return null;
};

/**
 * Get the ImageSource for a user's avatar.
 *
 * @param profilePic  - URL of user-uploaded profile picture (from user.profilePic)
 * @param gender      - Raw gender string from user profile (e.g. 'male', 'Female', 'M')
 */
export const getProfileAvatar = (
  profilePic?: string | null,
  gender?: string | null,
): ImageSourcePropType => {
  // 1. Prefer user-uploaded picture
  if (profilePic) {
    return { uri: profilePic };
  }

  // 2. Gender-based default avatar
  const canonical = normaliseGender(gender);
  if (canonical === 'male')   return MALE_AVATAR;
  if (canonical === 'female') return FEMALE_AVATAR;

  // 3. Neutral fallback — male avatar as default when gender unknown
  return MALE_AVATAR;
};
