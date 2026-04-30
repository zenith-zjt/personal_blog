"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AvatarCropperProps = {
  currentAvatarPath: string;
};

const canvasSize = 512;

function createCroppedFileName(originalName: string) {
  const stem = originalName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-");
  return `${stem || "avatar"}-cropped.png`;
}

export function AvatarCropper({ currentAvatarPath }: AvatarCropperProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  const drawCroppedAvatar = useCallback(async (nextStatus = "裁剪预览已更新。") => {
    if (!sourceUrl || !canvasRef.current || !hiddenInputRef.current) {
      return;
    }

    const image = new Image();
    image.src = sourceUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("头像图片读取失败。"));
    });

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    context.clearRect(0, 0, canvasSize, canvasSize);
    context.fillStyle = "#f5f0e7";
    context.fillRect(0, 0, canvasSize, canvasSize);

    const baseScale = Math.max(
      canvasSize / image.naturalWidth,
      canvasSize / image.naturalHeight,
    );
    const scale = baseScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxOffsetX = Math.max(0, (drawWidth - canvasSize) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - canvasSize) / 2);
    const drawX =
      (canvasSize - drawWidth) / 2 + (offsetX / 100) * maxOffsetX;
    const drawY =
      (canvasSize - drawHeight) / 2 + (offsetY / 100) * maxOffsetY;

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    canvas.toBlob((blob) => {
      if (!blob || !hiddenInputRef.current) {
        setStatus("裁剪失败，请重新选择图片。");
        return;
      }

      const file = new File([blob], createCroppedFileName(sourceName), {
        type: "image/png",
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      hiddenInputRef.current.files = transfer.files;
      setStatus(nextStatus);
    }, "image/png");
  }, [offsetX, offsetY, sourceName, sourceUrl, zoom]);

  useEffect(() => {
    if (!sourceUrl) {
      return;
    }

    const timer = window.setTimeout(() => {
      drawCroppedAvatar().catch(() => {
        setStatus("裁剪失败，请重新选择图片。");
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [drawCroppedAvatar, sourceUrl]);

  return (
    <div className="space-y-4 rounded-lg border border-stone-200 bg-[#fdfbf6] p-4">
      <input
        ref={hiddenInputRef}
        id="profile-avatar-file-cropped"
        name="avatarFile"
        type="file"
        accept="image/png"
        className="hidden"
      />

      <input
        id="profile-avatar-file"
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (!file) {
            return;
          }

          if (sourceUrl) {
            URL.revokeObjectURL(sourceUrl);
          }

          setSourceName(file.name);
          setSourceUrl(URL.createObjectURL(file));
          setZoom(1);
          setOffsetX(0);
          setOffsetY(0);
          setStatus("已选择图片，可调整裁剪区域。");
        }}
      />

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-stone-300 bg-stone-100 p-3">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="aspect-square w-full rounded-[22px] bg-stone-200 object-cover"
            aria-label="头像裁剪预览"
          />
        </div>

        <div className="space-y-4">
          <label className="block space-y-2 text-sm text-stone-700">
            <span className="font-medium">缩放</span>
            <input
              type="range"
              min="1"
              max="2.4"
              step="0.05"
              value={zoom}
              disabled={!sourceUrl}
              onChange={(event) => setZoom(Number(event.currentTarget.value))}
              className="w-full accent-stone-900"
            />
          </label>

          <label className="block space-y-2 text-sm text-stone-700">
            <span className="font-medium">水平位置</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={offsetX}
              disabled={!sourceUrl}
              onChange={(event) => setOffsetX(Number(event.currentTarget.value))}
              className="w-full accent-stone-900"
            />
          </label>

          <label className="block space-y-2 text-sm text-stone-700">
            <span className="font-medium">垂直位置</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={offsetY}
              disabled={!sourceUrl}
              onChange={(event) => setOffsetY(Number(event.currentTarget.value))}
              className="w-full accent-stone-900"
            />
          </label>

          <button
            type="button"
            data-testid="apply-avatar-crop"
            disabled={!sourceUrl}
            onClick={() => {
              drawCroppedAvatar("裁剪头像已应用，保存资料后生效。").catch(() => {
                setStatus("裁剪失败，请重新选择图片。");
              });
            }}
            className="rounded-lg border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-200 disabled:text-stone-500"
          >
            应用裁剪
          </button>
        </div>
      </div>

      <p className="text-xs leading-6 text-stone-500">
        当前头像路径：{currentAvatarPath || "未设置"}。裁剪输出会保存为 PNG，并写入
        data/resource。
      </p>
      {status ? <p className="text-xs text-stone-700">{status}</p> : null}
    </div>
  );
}
