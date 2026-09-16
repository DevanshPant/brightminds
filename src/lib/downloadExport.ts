import { API_BASE } from '@/lib/api';

/**
 * Downloads the student spreadsheet from the server. Built server-side so this
 * file and the one attached to enrolment emails are always identical - and so
 * no visitor pays for a ~1 MB spreadsheet library in the page bundle.
 */
export async function downloadStudentWorkbook(token: string) {
  const response = await fetch(`${API_BASE}/api/admin-export`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = `Export failed (${response.status}).`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new Error(message);
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const named = /filename="([^"]+)"/.exec(disposition)?.[1];
  const filename = named || `brightminds-students-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
