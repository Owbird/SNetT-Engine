document.addEventListener("DOMContentLoaded", () => {
  if (window.csvFilePath) {
    const csvTableContainer = document.getElementById("csv-table-container");
    if (csvTableContainer) {
      Papa.parse(window.csvFilePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function (results) {
          const data = results.data;
          if (data.length > 0) {
            let tableHTML = "<table><thead><tr>";
            // Headers
            for (const header in data[0]) {
              tableHTML += `<th>${header}</th>`;
            }
            tableHTML += "</tr></thead><tbody>";

            // Rows
            data.forEach((row) => {
              tableHTML += "<tr>";
              for (const cell in row) {
                tableHTML += `<td>${row[cell]}</td>`;
              }
              tableHTML += "</tr>";
            });

            tableHTML += "</tbody></table>";
            csvTableContainer.innerHTML = tableHTML;
          } else {
            csvTableContainer.innerHTML = "<p>No CSV data found.</p>";
          }
        },
        error: function (err) {
          csvTableContainer.innerHTML = `<p>Error parsing CSV: ${err.message}</p>`;
          console.error("Error parsing CSV:", err);
        },
      });
    }
  }
});
