export const APP_NAME = "File System Engine";

export const APP_ID = "com.filesystemengine.desktop";

export const PRODUCT_COPY = {
  ntfsReadOnly:
    "This NTFS drive is mounted read-only on macOS. To enable writing, install a compatible NTFS driver on this Mac, then refresh access.",
  androidUnauthorized:
    "Android device detected, but access is not authorized yet. Enable USB debugging on the device and authorize this computer.",
  duplicateReasoning:
    "These files appear to be copies or versions of the same content based on name patterns, size, and content similarity."
} as const;

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".csv",
  ".xlsx"
] as const;

