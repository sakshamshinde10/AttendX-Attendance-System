/**
 * Academic Service — Single source of truth for academic validation
 *
 * Provides:
 * 1. Year/Semester validity mapping
 * 2. Student profile enrichment
 * 3. Session eligibility check (server-side — never trust client data)
 */

'use strict';

// Canonical mapping: year → valid semesters
const YEAR_SEMESTER_MAP = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

/**
 * Ordinal label for academic year number
 * @param {number} year
 * @returns {string}
 */
const getYearLabel = (year) => {
  switch (year) {
    case 1: return '1st Year';
    case 2: return '2nd Year';
    case 3: return '3rd Year';
    case 4: return '4th Year';
    default: return `Year ${year}`;
  }
};

/**
 * Check whether a year/semester combination is academically valid
 * @param {number} year
 * @param {number} semester
 * @returns {boolean}
 */
const isValidYearSemester = (year, semester) => {
  const validSemesters = YEAR_SEMESTER_MAP[year];
  if (!validSemesters) return false;
  return validSemesters.includes(semester);
};

/**
 * Derive the default odd semester for a given year
 * (Used as fallback when semester is not stored on the user record)
 * @param {number} year
 * @returns {number}
 */
const getDefaultSemesterForYear = (year) => {
  return (year * 2) - 1; // 1→1, 2→3, 3→5, 4→7
};

/**
 * Validate that a student's academic profile has all required fields.
 * Returns an error message string or null if valid.
 * @param {{ departmentId, year, semester, division }} profile
 * @returns {string|null}
 */
const validateStudentProfile = (profile) => {
  if (!profile.departmentId) {
    return 'Academic profile incomplete: department information is missing.';
  }
  if (!profile.year || profile.year < 1 || profile.year > 4) {
    return 'Academic profile incomplete: invalid academic year.';
  }
  if (!profile.semester || profile.semester < 1 || profile.semester > 8) {
    return 'Academic profile incomplete: invalid semester.';
  }
  if (!isValidYearSemester(profile.year, profile.semester)) {
    return `Invalid academic combination: ${getYearLabel(profile.year)} cannot have Semester ${profile.semester}.`;
  }
  if (!profile.division) {
    return 'Academic profile incomplete: division information is missing.';
  }
  return null;
};

/**
 * Validate whether a student is eligible to mark attendance for a given session.
 *
 * IMPORTANT: Both studentProfile and session must come from the DATABASE,
 * never from client-submitted data.
 *
 * @param {{ departmentId, year, semester, division }} studentProfile
 * @param {{ departmentId, year, semester, division, subjectId }} session
 * @returns {{ eligible: boolean, reason: string|null }}
 */
const validateAttendanceEligibility = (studentProfile, session) => {
  // Validate student profile first
  const profileError = validateStudentProfile(studentProfile);
  if (profileError) {
    return { eligible: false, reason: profileError };
  }

  // Department check
  if (
    session.departmentId &&
    studentProfile.departmentId !== session.departmentId
  ) {
    return {
      eligible: false,
      reason: 'You are not enrolled in the department for this attendance session.',
    };
  }

  // Year check
  if (session.year && studentProfile.year !== session.year) {
    return {
      eligible: false,
      reason: `This session is for ${getYearLabel(session.year)} students. You are in ${getYearLabel(studentProfile.year)}.`,
    };
  }

  // Semester check
  if (session.semester && studentProfile.semester !== session.semester) {
    return {
      eligible: false,
      reason: `This session is for Semester ${session.semester}. Your current semester is Semester ${studentProfile.semester}.`,
    };
  }

  // Division check — only enforce if student has a division set
  if (
    session.division &&
    studentProfile.division &&
    session.division.toUpperCase() !== studentProfile.division.toUpperCase()
  ) {
    return {
      eligible: false,
      reason: `This session is for Division ${session.division}. You are in Division ${studentProfile.division}.`,
    };
  }

  return { eligible: true, reason: null };
};

module.exports = {
  YEAR_SEMESTER_MAP,
  getYearLabel,
  isValidYearSemester,
  getDefaultSemesterForYear,
  validateStudentProfile,
  validateAttendanceEligibility,
};
