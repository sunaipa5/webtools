const { PDFDocument } = PDFLib;

const pdfInput = document.getElementById("pdfInput");
const selectBtn = document.getElementById("selectBtn");
const clearBtn = document.getElementById("clearBtn");
const fileList = document.getElementById("fileList");
const processBtn = document.getElementById("processBtn");
const statusText = document.getElementById("statusText");
const dropZone = document.getElementById("dropZone");

const progressContainer = document.getElementById("progressContainer");
const progressBarFill = document.getElementById("progressBarFill");
const uploadStatusText = document.getElementById("uploadStatusText");
const uploadPercentText = document.getElementById("uploadPercentText");

let loadedFiles = [];

// Tarayıcının bırakılan dosyayı doğrudan açmasını engelle.
for (const eventName of ["dragenter", "dragover", "dragleave", "drop"]) {
  document.addEventListener(
    eventName,
    (event) => {
      event.preventDefault();
    },
    false,
  );
}

let dragDepth = 0;

dropZone.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth++;
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }

  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (event) => {
  event.preventDefault();

  dragDepth = Math.max(0, dragDepth - 1);

  if (dragDepth === 0) {
    dropZone.classList.remove("dragover");
  }
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  dragDepth = 0;
  dropZone.classList.remove("dragover");

  const files = Array.from(event.dataTransfer?.files ?? []).filter(isPdfFile);

  if (files.length > 0) {
    await processIncomingFiles(files);
  } else {
    statusText.textContent = "Please drop one or more PDF files.";
  }
});

selectBtn.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  pdfInput.click();
});

dropZone.addEventListener("click", (event) => {
  if (event.target.closest("button, input, a, label")) {
    return;
  }

  pdfInput.click();
});

pdfInput.addEventListener("change", async () => {
  const files = Array.from(pdfInput.files ?? []).filter(isPdfFile);

  pdfInput.value = "";

  if (files.length > 0) {
    await processIncomingFiles(files);
  }
});

function isPdfFile(file) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

clearBtn.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  loadedFiles = [];

  renderFileList();

  statusText.textContent = "";
});

async function processIncomingFiles(files) {
  progressContainer.style.display = "block";
  progressBarFill.style.width = "0%";
  uploadPercentText.textContent = "0%";

  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];

    try {
      uploadStatusText.textContent = `Reading ${file.name}...`;

      const buffer = await readFileWithProgress(file, (percent) => {
        const totalPercent = Math.round(
          ((i + percent / 100) / totalFiles) * 100,
        );

        progressBarFill.style.width = `${totalPercent}%`;
        uploadPercentText.textContent = `${totalPercent}%`;
      });

      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
      });

      const totalPages = pdfDoc.getPageCount();

      loadedFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        buffer: buffer,
        totalPages: totalPages,
        rangeStr: `1-${totalPages}`,
      });
    } catch (err) {
      console.error(`Error reading PDF (${file.name}):`, err);

      statusText.textContent = `Could not read ${file.name}. Check whether it is a valid PDF.`;
    }
  }

  progressBarFill.style.width = "100%";
  uploadPercentText.textContent = "100%";
  uploadStatusText.textContent = "Complete!";

  setTimeout(() => {
    progressContainer.style.display = "none";
  }, 800);

  renderFileList();
}

function readFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    };

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => reject(reader.error);

    reader.readAsArrayBuffer(file);
  });
}

function renderFileList() {
  fileList.innerHTML = "";

  if (loadedFiles.length === 0) {
    clearBtn.style.display = "none";
    processBtn.disabled = true;
    return;
  }

  clearBtn.style.display = "inline-block";
  processBtn.disabled = false;

  loadedFiles.forEach((fileItem, index) => {
    const itemEl = document.createElement("div");

    itemEl.className = "file-item";

    itemEl.innerHTML = `
      <div class="file-header">
        <span class="file-name">
          ${index + 1}. ${escapeHtml(fileItem.name)}
        </span>

        <span class="file-badge">
          ${fileItem.totalPages} Pages
        </span>
      </div>

      <div class="input-group">
        <label>Page Range (e.g., 1-5, 8, 10-12):</label>

        <input
          type="text"
          class="text-input"
          value="${escapeHtml(fileItem.rangeStr)}"
          data-id="${fileItem.id}"
        >
      </div>

      <div class="file-item-actions">
        <button
          type="button"
          class="btn-remove"
          data-id="${fileItem.id}"
        >
          Remove
        </button>
      </div>
    `;

    const rangeInput = itemEl.querySelector("input");

    rangeInput.addEventListener("input", (event) => {
      fileItem.rangeStr = event.target.value;
    });

    const removeBtn = itemEl.querySelector(".btn-remove");

    removeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      loadedFiles = loadedFiles.filter((file) => file.id !== fileItem.id);

      renderFileList();
    });

    fileList.appendChild(itemEl);
  });
}

function parsePageRanges(rangeStr, maxPages) {
  const indexes = new Set();
  const parts = rangeStr.split(",");

  for (let part of parts) {
    part = part.trim();

    if (!part) {
      continue;
    }

    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");

      const start = parseInt(startStr?.trim(), 10);
      const end = parseInt(endStr?.trim(), 10);

      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));

        for (let i = min; i <= max; i++) {
          indexes.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);

      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        indexes.add(pageNum - 1);
      }
    }
  }

  return Array.from(indexes).sort((a, b) => a - b);
}

processBtn.addEventListener("click", async () => {
  if (loadedFiles.length === 0) {
    return;
  }

  processBtn.disabled = true;
  statusText.textContent = "Processing PDF...";

  let downloadUrl = null;

  try {
    const mergedPdf = await PDFDocument.create();
    let totalPagesAdded = 0;
    const rangeParts = [];

    for (const fileItem of loadedFiles) {
      const srcPdf = await PDFDocument.load(fileItem.buffer);

      const pageIndexes = parsePageRanges(
        fileItem.rangeStr,
        fileItem.totalPages,
      );

      if (pageIndexes.length > 0) {
        const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndexes);

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        totalPagesAdded += pageIndexes.length;

        const cleanRange = fileItem.rangeStr
          .trim()
          .replace(/\s+/g, "")
          .replace(/,/g, "_");

        if (cleanRange) {
          rangeParts.push(cleanRange);
        }
      }
    }

    if (totalPagesAdded === 0) {
      statusText.textContent = "Please enter valid page ranges!";
      processBtn.disabled = false;
      return;
    }

    const mergedBytes = await mergedPdf.save();

    const blob = new Blob([mergedBytes], {
      type: "application/pdf",
    });

    downloadUrl = URL.createObjectURL(blob);

    const rangesSuffix = rangeParts.join("__");
    const fileName = rangesSuffix
      ? `processed_${rangesSuffix}.pdf`
      : "processed_document.pdf";

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    statusText.textContent = "Successfully downloaded!";
  } catch (err) {
    console.error("PDF processing error:", err);

    statusText.textContent = "An error occurred during processing.";
  } finally {
    processBtn.disabled = loadedFiles.length === 0;

    if (downloadUrl) {
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);
    }
  }
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
}
