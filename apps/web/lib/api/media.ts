import { apiUrl, withTenantQuery } from "./client";
import { useAuthStore } from "@/stores/authStore";
import { resolveViewingTenantId } from "./viewingTenant";
import {
  compressProductImage,
  PRODUCT_IMAGE_MAX_BYTES,
} from "@/lib/utils/compressProductImage";
import { canAccessVagPortal } from "@vonos/types";

export type ProductImageUploadResult = {
  url: string;
  key: string;
};

export type ProductImageUploadOptions = {
  /** 0–100 overall (compress + network). */
  onProgress?: (percent: number) => void;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const { token, role, tenantRoleName } = useAuthStore.getState();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (canAccessVagPortal({ role, tenantRoleName })) {
    const viewingTenant = resolveViewingTenantId();
    if (viewingTenant) headers["X-Viewing-Tenant"] = viewingTenant;
  }
  return headers;
}

function xhrUpload(
  url: string,
  body: FormData,
  onProgress?: (loadedRatio: number) => void,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    for (const [key, value] of Object.entries(authHeaders())) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress?.(Math.min(1, event.loaded / event.total));
    };
    xhr.onload = () => {
      const headers = new Headers();
      const raw = xhr.getAllResponseHeaders();
      for (const line of raw.trim().split(/[\r\n]+/)) {
        const parts = line.split(": ");
        const header = parts.shift();
        if (header) headers.append(header, parts.join(": "));
      }
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers,
        }),
      );
    };
    xhr.onerror = () => reject(new TypeError("Failed to fetch"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    xhr.send(body);
  });
}

/** Upload a product image to R2 via Nest; returns the public URL to store on Item.imageUrl. */
export async function uploadProductImage(
  file: File,
  tenantId?: string,
  options?: ProductImageUploadOptions,
): Promise<ProductImageUploadResult> {
  const report = (pct: number) => {
    options?.onProgress?.(Math.max(0, Math.min(100, Math.round(pct))));
  };

  report(4);
  const compressed = await compressProductImage(file);
  report(18);
  if (compressed.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 12MB or smaller");
  }

  const body = new FormData();
  body.append("file", compressed);
  const path = withTenantQuery("/media/upload", tenantId);

  let response: Response;
  try {
    response = await xhrUpload(apiUrl(path), body, (ratio) => {
      // Map network 0→1 onto overall 18→96.
      report(18 + ratio * 78);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        "Could not reach the API to upload the image. Confirm the API is running and open the app via http://localhost:3000 (not 127.0.0.1).",
      );
    }
    throw err instanceof Error ? err : new Error(msg);
  }

  if (!response.ok) {
    let message = "Image upload failed";
    try {
      const err = (await response.json()) as { message?: string | string[] };
      if (typeof err.message === "string") message = err.message;
      else if (Array.isArray(err.message) && err.message[0]) {
        message = err.message[0];
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  report(100);
  return (await response.json()) as ProductImageUploadResult;
}
