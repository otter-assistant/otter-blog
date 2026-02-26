// src/scripts/gzip-compare.ts

interface GzipResult {
  originalBytes: number;
  gzipBytes: number;
  ratio: number;
  saved: number;
}

async function gzipSizeBytes(text: string): Promise<number> {
  const bytes = new TextEncoder().encode(text);

  if ("CompressionStream" in window) {
    const cs = new CompressionStream("gzip");
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    return (await new Response(stream).arrayBuffer()).byteLength;
  }

  const { gzipSync } = await import("fflate");
  return gzipSync(bytes).byteLength;
}

async function calculateGzip(text: string): Promise<GzipResult> {
  if (!text) {
    return {
      originalBytes: 0,
      gzipBytes: 0,
      ratio: 0,
      saved: 0,
    };
  }

  const originalBytes = new TextEncoder().encode(text).byteLength;
  const gzipBytes = await gzipSizeBytes(text);
  const ratio = originalBytes > 0 ? gzipBytes / originalBytes : 0;
  const saved = 1 - ratio;

  return {
    originalBytes,
    gzipBytes,
    ratio,
    saved,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function updateResult(
  containerId: string,
  result: GzipResult,
  status: "loading" | "success" | "error" | "empty"
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (status === "loading") {
    container.innerHTML = '<p class="text-gray-500">计算中...</p>';
    return;
  }

  if (status === "empty") {
    container.innerHTML = '<p class="text-gray-400">请输入文本</p>';
    return;
  }

  if (status === "error") {
    container.innerHTML = '<p class="text-red-500">计算失败</p>';
    return;
  }

  container.innerHTML = `
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">原始大小:</span>
        <span class="font-semibold text-gray-900 dark:text-gray-100">${formatBytes(result.originalBytes)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">Gzip 后:</span>
        <span class="font-semibold text-gray-900 dark:text-gray-100">${formatBytes(result.gzipBytes)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">压缩率:</span>
        <span class="font-semibold text-primary">${formatPercent(result.ratio)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600 dark:text-gray-400">节省:</span>
        <span class="font-semibold text-green-600 dark:text-green-400">${formatPercent(result.saved)}</span>
      </div>
    </div>
  `;
}

function updateComparison(resultA: GzipResult, resultB: GzipResult) {
  const container = document.getElementById("comparison");
  if (!container) return;

  if (resultA.originalBytes === 0 && resultB.originalBytes === 0) {
    container.innerHTML = '<p class="text-gray-400 text-center">输入文本后查看对比结果</p>';
    return;
  }

  if (resultA.originalBytes === 0 || resultB.originalBytes === 0) {
    container.innerHTML = '<p class="text-gray-400 text-center">请输入两段文本进行对比</p>';
    return;
  }

  const ratioDiff = resultA.ratio - resultB.ratio;
  const savedDiff = resultB.saved - resultA.saved;

  let comparisonText = "";
  let comparisonClass = "";

  if (Math.abs(ratioDiff) < 0.01) {
    comparisonText = "两段文本压缩率相近";
    comparisonClass = "text-gray-600 dark:text-gray-400";
  } else if (resultA.ratio < resultB.ratio) {
    comparisonText = `文本 A 压缩率更低，比 B 节省 ${formatPercent(savedDiff)} 空间`;
    comparisonClass = "text-green-600 dark:text-green-400";
  } else {
    comparisonText = `文本 B 压缩率更低，比 A 节省 ${formatPercent(-savedDiff)} 空间`;
    comparisonClass = "text-blue-600 dark:text-blue-400";
  }

  container.innerHTML = `
    <div class="text-center space-y-2">
      <p class="${comparisonClass} font-semibold text-lg">${comparisonText}</p>
      <div class="flex justify-center gap-8 text-sm">
        <div>
          <span class="text-gray-600 dark:text-gray-400">A: </span>
          <span class="font-semibold text-gray-900 dark:text-gray-100">${formatPercent(resultA.ratio)}</span>
        </div>
        <div>
          <span class="text-gray-600 dark:text-gray-400">B: </span>
          <span class="font-semibold text-gray-900 dark:text-gray-100">${formatPercent(resultB.ratio)}</span>
        </div>
      </div>
    </div>
  `;
}

export function initGzipCompare() {
  const textareaA = document.getElementById("text-a") as HTMLTextAreaElement;
  const textareaB = document.getElementById("text-b") as HTMLTextAreaElement;
  const resultAContainer = document.getElementById("result-a");
  const resultBContainer = document.getElementById("result-b");

  if (!textareaA || !textareaB) {
    console.warn("Gzip compare: textarea elements not found");
    return;
  }

  let debounceTimer: number | undefined;
  let resultA: GzipResult = { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 };
  let resultB: GzipResult = { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 };

  async function processText(
    text: string,
    resultId: string,
    setResult: (r: GzipResult) => void
  ) {
    if (!text) {
      updateResult(resultId, { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 }, "empty");
      setResult({ originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 });
      return;
    }

    updateResult(resultId, { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 }, "loading");

    try {
      const result = await calculateGzip(text);
      updateResult(resultId, result, "success");
      setResult(result);
    } catch (error) {
      console.error("Gzip calculation error:", error);
      updateResult(resultId, { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 }, "error");
      setResult({ originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 });
    }
  }

  async function updateBoth() {
    await Promise.all([
      processText(textareaA.value, "result-a", (r) => (resultA = r)),
      processText(textareaB.value, "result-b", (r) => (resultB = r)),
    ]);
    updateComparison(resultA, resultB);
  }

  function debouncedUpdate() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      updateBoth();
    }, 150);
  }

  textareaA.addEventListener("input", debouncedUpdate);
  textareaB.addEventListener("input", debouncedUpdate);

  // 初始化状态
  updateResult("result-a", { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 }, "empty");
  updateResult("result-b", { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 }, "empty");
  updateComparison(
    { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 },
    { originalBytes: 0, gzipBytes: 0, ratio: 0, saved: 0 }
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGzipCompare);
} else {
  initGzipCompare();
}
