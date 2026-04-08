export type ClassroomV2FlagValue = string | string[] | undefined;

const ENABLED_VALUES = new Set(["1", "true", "yes", "on", "preview"]);
const CLASSROOM_V2_QUERY = "?v2=1";

export function isClassroomV2Enabled(flag: ClassroomV2FlagValue) {
  if (Array.isArray(flag)) {
    return flag.some(isEnabledValue);
  }

  return isEnabledValue(flag);
}

export function getClassroomV2PreviewHref(studentId: string) {
  return `/classroom/${studentId}${CLASSROOM_V2_QUERY}`;
}

export function getLegacyClassroomHref(studentId: string) {
  return `/classroom/${studentId}`;
}

function isEnabledValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ENABLED_VALUES.has(value.toLowerCase());
}
