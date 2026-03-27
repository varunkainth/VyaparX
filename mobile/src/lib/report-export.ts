import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { ReportExportFormat } from '@/services/report.service';

const EXPORT_DIRECTORY_URI_KEY = 'vyaparx_mobile_export_directory_uri';

export async function exportBinaryReportFile(args: {
  baseName: string;
  bytes: ArrayBuffer;
  format: ReportExportFormat;
}) {
  const { baseName, bytes, format } = args;
  const extension = format === 'excel' ? 'xlsx' : 'csv';
  const mimeType =
    format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv;charset=utf-8';

  return saveBinaryFile({
    baseName,
    bytes,
    extension,
    mimeType,
  });
}

export async function savePdfFile(args: {
  baseName: string;
  bytes: ArrayBuffer;
}) {
  return saveBinaryFile({
    baseName: args.baseName,
    bytes: args.bytes,
    extension: 'pdf',
    mimeType: 'application/pdf',
  });
}

export function buildCsvFromRows(rows: Array<Record<string, string | number>>) {
  if (!rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header] ?? '')).join(',')),
  ];

  return lines.join('\n');
}

export async function exportCsvText(args: {
  baseName: string;
  content: string;
}) {
  const bytes = Buffer.from(args.content, 'utf-8');
  return exportBinaryReportFile({
    baseName: args.baseName,
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    format: 'csv',
  });
}

export function getDefaultReportRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from_date: from.toISOString().slice(0, 10),
    to_date: to.toISOString().slice(0, 10),
  };
}

async function saveBinaryFile(args: {
  baseName: string;
  bytes: ArrayBuffer;
  extension: string;
  mimeType: string;
}) {
  const { baseName, bytes, extension, mimeType } = args;
  const fileName = `${sanitizeFileName(baseName)}-${buildTimestamp()}.${extension}`;

  if (Platform.OS === 'web') {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { fileName, location: 'download' as const };
  }

  const base64 = Buffer.from(bytes).toString('base64');

  if (Platform.OS === 'android') {
    const uri = await saveIntoAndroidExportFolder(fileName, mimeType, base64);
    return { fileName, location: 'device-folder' as const, uri };
  }

  if (!FileSystem.documentDirectory) {
    throw new Error('File export is unavailable on this device.');
  }

  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File saving is unavailable on this device.');
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: `Export ${baseName}`,
    mimeType,
  });

  return { fileName, location: 'share-sheet' as const, uri };
}

async function saveIntoAndroidExportFolder(fileName: string, mimeType: string, base64: string) {
  const StorageAccessFramework = FileSystem.StorageAccessFramework;
  const savedDirectoryUri = await SecureStore.getItemAsync(EXPORT_DIRECTORY_URI_KEY);
  const directoryUri = await resolveExportDirectoryUri(savedDirectoryUri);

  if (!directoryUri) {
    throw new Error('Choose a device folder for VyaparX exports first.');
  }

  try {
    const fileUri = await StorageAccessFramework.createFileAsync(directoryUri, fileName, mimeType);
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  } catch (error) {
    await SecureStore.deleteItemAsync(EXPORT_DIRECTORY_URI_KEY);
    throw error;
  }
}

async function resolveExportDirectoryUri(savedDirectoryUri: string | null) {
  const StorageAccessFramework = FileSystem.StorageAccessFramework;

  if (savedDirectoryUri) {
    return savedDirectoryUri;
  }

  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted || !permission.directoryUri) {
    return null;
  }

  await SecureStore.setItemAsync(EXPORT_DIRECTORY_URI_KEY, permission.directoryUri);
  return permission.directoryUri;
}

function buildTimestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function sanitizeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'vyaparx-export';
}
