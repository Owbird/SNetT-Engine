const cookBreadCrumbs = (path, container) => {
  const segments = path.split("/").filter(Boolean);

  const breadcrumbItems = segments.map((segment, index) => {
    const url = "?dir=/" + segments.slice(0, index + 1).join("/");
    return `
      <li class="breadcrumb-item">
        <svg class="breadcrumb-separator" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
        </svg>
        <a href="${url}" class="breadcrumb-link">${segment}</a>
      </li>
    `;
  });

  container.innerHTML = `
    <nav class="breadcrumb-nav" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
          <a href="/" class="breadcrumb-link">
            <svg class="breadcrumb-home-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
            </svg>
            Home
          </a>
        </li>
        ${breadcrumbItems.join("")}
      </ol>
    </nav>
  `;
};

document.addEventListener("DOMContentLoaded", () => {
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("file-upload");
  const uploadButton = document.getElementById("upload-button");
  const uploadStatus = document.getElementById("upload-status");
  const breadcrumbsContainer = document.getElementById("breadcrumbs");

  const { searchParams } = new URL(window.location.href);

  const uploadDir = searchParams.get("dir") ?? "/";

  cookBreadCrumbs(uploadDir, breadcrumbsContainer);

  let files;

  const updateUploadBtnLabel = (total) => {
    if (total > 0) {
      uploadButton.innerText = `Upload ${total} file${total > 1 ? "s" : ""}`;
      uploadButton.classList.remove("hidden");
    }
  };

  const uploadFiles = async (files) => {
    const formData = new FormData();

    for (let file of files) {
      formData.append("file", file);
    }

    formData.append("uploadDir", uploadDir);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          uploadStatus.textContent = `Uploading: ${percentComplete.toFixed(2)}%`;
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          uploadStatus.textContent = "Upload complete!";
          window.location.reload();
          resolve();
        } else {
          uploadStatus.textContent = "Error uploading files.";
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => {
        uploadStatus.textContent = "Network error during upload.";
        reject(new Error("Network error"));
      });

      xhr.open("POST", "/upload", true);
      xhr.send(formData);
    });
  };

  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("bg-teal-100");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("bg-teal-100");
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("bg-teal-100");
    files = e.dataTransfer.files;
    updateUploadBtnLabel(files.length);
  });

  fileInput.addEventListener("change", () => {
    files = fileInput.files;
    updateUploadBtnLabel(files.length);
  });

  uploadButton.addEventListener("click", () => {
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  });
});

const searchInput = document.getElementById("search-input");
const fileTable = document.querySelector(".file-table tbody");

if (searchInput && fileTable) {
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const fileTableRows = fileTable.querySelectorAll("tr");

    fileTableRows.forEach((row) => {
      const fileNameElement = row.querySelector(".file-name");

      if (fileNameElement) {
        const fileName = fileNameElement.textContent.toLowerCase();
        row.style.display = fileName.includes(searchTerm)
          ? "table-row"
          : "none";
      }
    });
  });
}
